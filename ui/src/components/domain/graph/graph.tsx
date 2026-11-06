import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { logger } from '@/utils/logger';
import { FunnelIcon, GearIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
    ControlsContainer,
    SigmaContainer,
    useCamera,
    useFullScreen,
    useLoadGraph,
    useRegisterEvents,
    useSetSettings,
    useSigma,
} from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import { MiniMap } from '@react-sigma/minimap';
import EdgeCurveProgram, {
    DEFAULT_EDGE_CURVATURE,
    indexParallelEdgesIndex,
} from '@sigma/edge-curve';
import { MultiDirectedGraph } from 'graphology';
import type { ForceAtlas2LayoutParameters } from 'graphology-layout-forceatlas2';
import { useTheme } from 'next-themes';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
    type RefObject,
} from 'react';
import {
    AiFillPauseCircle,
    AiFillPlayCircle,
    AiOutlineFullscreen,
    AiOutlineFullscreenExit,
    AiOutlineZoomIn,
    AiOutlineZoomOut,
} from 'react-icons/ai';
import { MdFilterCenterFocus } from 'react-icons/md';
import type Sigma from 'sigma';
import { drawDiscNodeLabel, type NodeHoverDrawingFunction } from 'sigma/rendering';
import { Edge, Node } from './graph-filter-utils';
import { entityLayout } from './graph-layout';

interface GraphConfig {
    nodeRadiusCoefficient?: number;
    linkWidthCoefficient?: number;
    showLinks?: boolean;
    curvedLinks?: boolean;
    scaleLinksOnZoom?: boolean;
    showLinkWidthLegend?: boolean;
    simulationGravity?: number;
    simulationRepulsion?: number;
    simulationLinkSpring?: number;
    simulationLinkDistance?: number;
    simulationFriction?: number;
    simulationCluster?: number;
}

interface FetchProgress {
    currentPage: number;
    totalPages: number;
    isPaused: boolean;
}

interface FetchControls {
    pause: () => void;
    resume: () => void;
}

interface GraphViewerProps {
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    config?: GraphConfig;
    nodes?: Node[];
    edges?: Edge[];
    onClearGraph?: () => void;
    activePanel?: 'explorer' | 'display' | 'filters' | null;
    onTogglePanel?: (panel: 'explorer' | 'display' | 'filters') => void;
    sigmaRef?: RefObject<{ sigma: Sigma } | null>;
    isLoading?: boolean;
    fetchProgress?: FetchProgress | null;
    fetchControls?: FetchControls | null;
}

interface LayoutContextValue {
    stop: () => void;
    start: () => void;
    isRunning: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

const SIGMA_EDGE_PROGRAM_CLASSES = { curved: EdgeCurveProgram };

const PARALLEL_EDGE_INDEX_ATTRS = [
    'parallelIndex',
    'parallelMinIndex',
    'parallelMaxIndex',
] as const;

/**
 * Curvature for parallel edges (same extremities), adapted from sigma.js edge-curve storybook.
 */
function bundleCurvature(index: number, maxIndex: number): number {
    if (maxIndex <= 0) return DEFAULT_EDGE_CURVATURE;
    if (index < 0) return -bundleCurvature(-index, maxIndex);
    const amplitude = 3.5;
    const maxCurvature =
        amplitude * (1 - Math.exp(-maxIndex / amplitude)) * DEFAULT_EDGE_CURVATURE;
    return (maxCurvature * index) / maxIndex;
}

function applyCurvedEdgeRenderAttrs(g: MultiDirectedGraph) {
    if (g.size === 0) return;
    indexParallelEdgesIndex(g);
    g.forEachEdge((edge, attrs) => {
        const parallelIndex = attrs.parallelIndex as number | null | undefined;
        const parallelMinIndex = attrs.parallelMinIndex as number | null | undefined;
        const parallelMaxIndex = attrs.parallelMaxIndex as number | null | undefined;
        let curvature = DEFAULT_EDGE_CURVATURE;
        if (
            typeof parallelMinIndex === 'number' &&
            typeof parallelIndex === 'number' &&
            typeof parallelMaxIndex === 'number'
        ) {
            curvature = bundleCurvature(parallelIndex, parallelMaxIndex);
        } else if (
            typeof parallelIndex === 'number' &&
            typeof parallelMaxIndex === 'number'
        ) {
            curvature = bundleCurvature(parallelIndex, parallelMaxIndex);
        }
        g.mergeEdgeAttributes(edge, { type: 'curved', curvature });
        for (const key of PARALLEL_EDGE_INDEX_ATTRS) {
            if (g.hasEdgeAttribute(edge, key)) {
                g.removeEdgeAttribute(edge, key);
            }
        }
    });
}

function buildForceAtlas2Params(
    config: GraphConfig,
    nodeCount: number,
    large: boolean,
): ForceAtlas2LayoutParameters {
    const friction = config.simulationFriction ?? 0.75;
    const repulsion = config.simulationRepulsion ?? 0;
    const gravity = config.simulationGravity ?? 0.15;
    const linkSpring = config.simulationLinkSpring ?? 0.6;
    const linkDistance = config.simulationLinkDistance ?? 16;

    const linkTightness = Math.sqrt(Math.min(24, Math.max(4, linkDistance)) / 16);
    const cluster = config.simulationCluster ?? 0.1;
    const clusterScale = 1 + cluster * 0.35;

    return {
        settings: {
            slowDown: 2.4 + friction * 12,
            scalingRatio: 2 + repulsion * 4 * linkTightness * clusterScale,
            gravity: gravity * 0.07,
            outboundAttractionDistribution: false,
            linLogMode: true,
            barnesHutOptimize: nodeCount >= 80,
            barnesHutTheta: 0.85,
            adjustSizes: large,
            edgeWeightInfluence: Math.max(0.2, Math.min(2, 0.45 + linkSpring * 0.75)),
        },
    };
}

function SetSigmaRef({ sigmaRef }: { sigmaRef: RefObject<{ sigma: Sigma } | null> }) {
    const sigma = useSigma();
    useEffect(() => {
        if (sigmaRef) {
            sigmaRef.current = { sigma };
            return () => {
                sigmaRef.current = null;
            };
        }
    }, [sigma, sigmaRef]);
    return null;
}

interface SigmaGraphBindingsProps {
    validNodes: Node[];
    linksData: Array<Edge & { _sourceIndex: number; _targetIndex: number }>;
    idToNode: Map<string, Node>;
    config: GraphConfig;
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    onTogglePanel?: (panel: 'explorer' | 'display' | 'filters') => void;
    activePanel: 'explorer' | 'display' | 'filters' | null;
}

// Sigma's WebGL color parser only understands hex/rgb()/named colors (anything
// else renders black), so CSS colors (var(), oklch, ...) are resolved to rgba.
let colorCtx: CanvasRenderingContext2D | null = null;
function toSigmaColor(color: string): string {
    const probe = document.createElement('span');
    probe.style.color = color;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    colorCtx ??= document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
    if (!colorCtx) return computed;
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = computed;
    colorCtx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 255] = colorCtx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

// Sigma's built-in hover renderer hardcodes a white label box, which hides the
// label on dark themes. Same shape, but painted with the theme's popover colors.
function createNodeHoverRenderer(
    background: string,
    foreground: string,
): NodeHoverDrawingFunction {
    return (context, data, settings) => {
        const size = settings.labelSize;
        context.font = `${settings.labelWeight} ${size}px ${settings.labelFont}`;
        context.fillStyle = background;
        context.shadowBlur = 8;
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';

        const PADDING = 2;
        context.beginPath();
        if (typeof data.label === 'string') {
            const boxWidth = Math.round(context.measureText(data.label).width + 5);
            const boxHeight = Math.round(size + 2 * PADDING);
            const radius = Math.max(data.size, size / 2) + PADDING;
            const angle = Math.asin(boxHeight / 2 / radius);
            const xDelta = Math.sqrt(Math.abs(radius ** 2 - (boxHeight / 2) ** 2));
            context.moveTo(data.x + xDelta, data.y + boxHeight / 2);
            context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
            context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
            context.lineTo(data.x + xDelta, data.y - boxHeight / 2);
            context.arc(data.x, data.y, radius, angle, -angle);
        } else {
            context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
        }
        context.closePath();
        context.fill();
        context.shadowBlur = 0;

        drawDiscNodeLabel(context, data, {
            ...settings,
            labelColor: { color: foreground },
        });
    };
}

/** `Node.type` of entities (the compressed entry tree's key for them); artifacts are `'artifacts'`. */
const ENTITY_TYPE = 'entities';

/**
 * Graphs with this many links or nodes are large: map-like sizes (see sizeSettings) and no minimap. The node count
 * matters on its own: a few thousand nodes drawn at a fixed pixel size merge into blobs at the full view however few
 * links they have.
 */
const LARGE_GRAPH_EDGES = 5000;
const LARGE_GRAPH_NODES = 1000;

/**
 * `color` mixed into `background` at `weight` (0 to 1), as a solid colour. Fading needs this: sigma's WebGL blending
 * adds a semi-transparent colour at full strength, so transparency brightens instead of fading.
 */
function fade(color: string, background: string, weight: number): string {
    const channels = (rgba: string) =>
        (rgba.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const [r = 0, g = 0, b = 0] = channels(color);
    const [br = 0, bg = 0, bb = 0] = channels(background);
    const mix = (c: number, base: number) => Math.round(base + (c - base) * weight);
    return `rgba(${mix(r, br)}, ${mix(g, bg)}, ${mix(b, bb)}, 1)`;
}

/**
 * Radius of a node with `degree` links: hubs stand out, leaves stay small. In pixels on small graphs, in layout units
 * on large ones (see sizeSettings).
 */
function nodeSize(degree: number | undefined): number {
    return Math.min(20, 2 + 2 * Math.log2(1 + (degree ?? 1)));
}

/** Link thickness: a fraction of the smallest node, never thinner than sigma's minEdgeThickness. */
const EDGE_SIZE = 0.15;

/**
 * On large graphs sizes are in layout units and scale exactly with the zoom, like objects on a map: ForceAtlas2 keeps
 * nodes apart by their sizes (adjustSizes), so nodes apart at one zoom level stay apart at all of them, and zooming
 * into a dense cluster spreads it out. Small graphs keep sigma's defaults (sizes in pixels, growing slowly with the
 * zoom): fitted to the screen, their few nodes would otherwise be drawn huge.
 */
function sizeSettings(large: boolean) {
    return large
        ? {
              itemSizesReference: 'positions' as const,
              zoomToSizeRatioFunction: (ratio: number) => ratio,
          }
        : { itemSizesReference: 'screen' as const, zoomToSizeRatioFunction: Math.sqrt };
}

/** `denseLinks`: the graph has LARGE_GRAPH_EDGES links or more, so they are drawn faint and skipped while moving. */
function SigmaGraphThemeColors({
    large,
    denseLinks,
}: {
    large: boolean;
    denseLinks: boolean;
}) {
    const setSettings = useSetSettings();
    const isDarkMode = useTheme().resolvedTheme === 'dark';

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const mutedColor = toSigmaColor('var(--color-muted-foreground)');
            const background = toSigmaColor('var(--background)');
            setSettings({
                // Edge clicks need every edge drawn again for hit-testing, too costly with this many links.
                enableEdgeEvents: !denseLinks,
                hideEdgesOnMove: denseLinks,
                ...sizeSettings(large),
                // With this many links, most are thinner than a pixel at the full view; sigma draws them at least this
                // thick (default 1.7), which would cover the clusters in grey.
                minEdgeThickness: denseLinks ? 0.5 : 1.7,
                defaultEdgeColor: denseLinks
                    ? fade(mutedColor, background, 0.3)
                    : mutedColor,
                defaultNodeColor: toSigmaColor('var(--color-primary)'),
                edgeLabelColor: { color: mutedColor },
                defaultDrawNodeHover: createNodeHoverRenderer(
                    toSigmaColor('var(--color-popover)'),
                    toSigmaColor('var(--color-popover-foreground)'),
                ),
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [setSettings, isDarkMode, large, denseLinks]);

    return null;
}

/**
 * While a node is hovered, it, its neighbours and the links between them stay in full colour; everything else stays
 * where it is, only darker, so the neighbourhood stands out without losing the rest of the graph.
 */
function SigmaHoverFocus() {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    const setSettings = useSetSettings();
    const [hovered, setHovered] = useState<string | null>(null);

    useEffect(() => {
        registerEvents({
            enterNode: (event) => setHovered(event.node),
            leaveNode: () => setHovered(null),
        });
    }, [registerEvents]);

    useEffect(() => {
        if (!hovered || !sigma.getGraph().hasNode(hovered)) {
            setSettings({ nodeReducer: null, edgeReducer: null, zIndex: false });
            return;
        }
        const graph = sigma.getGraph();
        const focused = new Set(graph.neighbors(hovered));
        focused.add(hovered);
        const background = toSigmaColor('var(--background)');
        const muted = toSigmaColor('var(--color-muted-foreground)');
        const highlight = toSigmaColor('var(--color-foreground)');
        const dimmedEdge = fade(muted, background, 0.1);
        const darker = new Map<string, string>();
        const darken = (color: string = sigma.getSetting('defaultNodeColor')) => {
            let dimmed = darker.get(color);
            if (!dimmed) {
                dimmed = fade(color, background, 0.25);
                darker.set(color, dimmed);
            }
            return dimmed;
        };
        setSettings({
            zIndex: true,
            nodeReducer: (node, data) =>
                focused.has(node)
                    ? { ...data, zIndex: 1 }
                    : { ...data, color: darken(data.color), zIndex: 0 },
            edgeReducer: (edge, data) =>
                graph.hasExtremity(edge, hovered)
                    ? { ...data, color: highlight, zIndex: 1 }
                    : { ...data, color: dimmedEdge, zIndex: 0 },
        });
    }, [hovered, sigma, setSettings]);

    return null;
}

function SigmaGraphologyLoader({
    validNodes,
    linksData,
    config,
}: Pick<SigmaGraphBindingsProps, 'validNodes' | 'linksData' | 'config'>) {
    const loadGraph = useLoadGraph();

    useEffect(() => {
        const sizeCoef = config.nodeRadiusCoefficient ?? 1;
        const g = new MultiDirectedGraph();
        const sigmaColors = new Map<string, string>();
        const resolveColor = (color: string) => {
            let resolved = sigmaColors.get(color);
            if (!resolved) {
                resolved = toSigmaColor(color);
                sigmaColors.set(color, resolved);
            }
            return resolved;
        };
        const entityIds = new Set(
            validNodes
                .filter((node) => node.type === ENTITY_TYPE)
                .map((node) => node.id),
        );
        const sizes = new Map(
            validNodes.map((node) => [node.id, nodeSize(node.degree) * sizeCoef]),
        );
        const positions = entityLayout(
            validNodes.map((node) => node.id),
            linksData,
            (id) => entityIds.has(id),
            (id) => sizes.get(id)!,
        );
        validNodes.forEach((node) => {
            g.addNode(node.id, {
                ...positions.get(node.id)!,
                size: sizes.get(node.id)!,
                label: node.label || node.id,
                color:
                    node.color && !node.color.startsWith('var(')
                        ? resolveColor(node.color)
                        : undefined,
            });
        });
        if (config.showLinks !== false) {
            linksData.forEach((edge) => {
                const edgeKey =
                    edge.id != null && String(edge.id) !== '' ? String(edge.id) : null;
                if (edgeKey) {
                    if (!g.hasEdge(edgeKey)) {
                        g.addEdgeWithKey(edgeKey, edge.source, edge.target, {
                            size: EDGE_SIZE,
                        });
                    }
                } else if (!g.hasEdge(edge.source, edge.target)) {
                    g.addEdge(edge.source, edge.target, { size: EDGE_SIZE });
                }
            });
            if (config.curvedLinks === true) {
                applyCurvedEdgeRenderAttrs(g);
            }
        }
        loadGraph(g, true);
    }, [
        loadGraph,
        validNodes,
        linksData,
        config.showLinks,
        config.curvedLinks,
        config.nodeRadiusCoefficient,
    ]);

    return null;
}

function SigmaGraphEvents({
    idToNode,
    selectedNodes,
    setSelectedNodes,
    onTogglePanel,
    activePanel,
}: Omit<SigmaGraphBindingsProps, 'validNodes' | 'linksData' | 'config'>) {
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const layoutContext = useContext(LayoutContext);
    const draggedNodeRef = useRef<string | null>(null);
    const nodeDragMovedRef = useRef(false);
    const ignoreClickNodeIdRef = useRef<string | null>(null);
    const stoppedLayoutForDragRef = useRef(false);
    const selectedNodesRef = useRef(selectedNodes);
    const idToNodeRef = useRef(idToNode);
    const layoutContextRef = useRef(layoutContext);
    const activePanelRef = useRef(activePanel);
    const onTogglePanelRef = useRef(onTogglePanel);
    const setSelectedNodesRef = useRef(setSelectedNodes);

    selectedNodesRef.current = selectedNodes;
    idToNodeRef.current = idToNode;
    layoutContextRef.current = layoutContext;
    activePanelRef.current = activePanel;
    onTogglePanelRef.current = onTogglePanel;
    setSelectedNodesRef.current = setSelectedNodes;

    useEffect(() => {
        registerEvents({
            clickNode: (event) => {
                try {
                    const nodeKey = event.node;
                    if (ignoreClickNodeIdRef.current === nodeKey) {
                        ignoreClickNodeIdRef.current = null;
                        return;
                    }
                    const idToNode = idToNodeRef.current;
                    const node = idToNode.get(nodeKey);
                    if (!node) return;
                    let newNodes = new Set<Node>([node]);
                    if (selectedNodesRef.current.has(node)) {
                        try {
                            const g = sigma.getGraph();
                            const neighbors = g.neighbors(nodeKey);
                            const neighborNodes = neighbors
                                .map((key) => idToNode.get(key))
                                .filter(Boolean) as Node[];
                            neighborNodes.unshift(node);
                            newNodes = new Set(neighborNodes);
                        } catch (e) {
                            logger.warn('Sigma neighbors lookup failed', {
                                cause: e,
                            });
                        }
                    }
                    setSelectedNodesRef.current(newNodes);
                    const onToggle = onTogglePanelRef.current;
                    if (onToggle && activePanelRef.current !== 'explorer') {
                        onToggle('explorer');
                    }
                } catch (error) {
                    logger.error('Graph node click failed', error);
                }
            },
            clickStage: () => {
                ignoreClickNodeIdRef.current = null;
                setSelectedNodesRef.current(new Set());
            },
            clickEdge: (event) => {
                try {
                    const idToNode = idToNodeRef.current;
                    const g = sigma.getGraph();
                    const [source, target] = g.extremities(event.edge);
                    const sourceNode = source ? idToNode.get(source) : undefined;
                    const targetNode = target ? idToNode.get(target) : undefined;
                    const newNodes = new Set<Node>();
                    if (sourceNode) newNodes.add(sourceNode);
                    if (targetNode) newNodes.add(targetNode);
                    setSelectedNodesRef.current(newNodes);
                    const onToggle = onTogglePanelRef.current;
                    if (onToggle && activePanelRef.current !== 'explorer') {
                        onToggle('explorer');
                    }
                } catch (error) {
                    logger.error('Graph edge click failed', error);
                }
            },
            downNode: (event) => {
                sigma.setCustomBBox(sigma.getBBox());
                draggedNodeRef.current = event.node;
                nodeDragMovedRef.current = false;
                ignoreClickNodeIdRef.current = null;
                sigma.getGraph().setNodeAttribute(event.node, 'highlighted', true);
                const lc = layoutContextRef.current;
                if (lc?.isRunning) {
                    lc.stop();
                    stoppedLayoutForDragRef.current = true;
                }
            },
            mousemovebody: (event) => {
                const draggedNode = draggedNodeRef.current;
                if (!draggedNode) return;
                nodeDragMovedRef.current = true;
                const pos = sigma.viewportToGraph(event);
                sigma.getGraph().setNodeAttribute(draggedNode, 'x', pos.x);
                sigma.getGraph().setNodeAttribute(draggedNode, 'y', pos.y);
                event.preventSigmaDefault();
                event.original.preventDefault();
                event.original.stopPropagation();
            },
            mouseup: () => {
                const draggedNode = draggedNodeRef.current;
                if (draggedNode) {
                    if (nodeDragMovedRef.current) {
                        ignoreClickNodeIdRef.current = draggedNode;
                    }
                    nodeDragMovedRef.current = false;
                    draggedNodeRef.current = null;
                    sigma.getGraph().removeNodeAttribute(draggedNode, 'highlighted');
                    sigma.setCustomBBox(null);
                    const lc = layoutContextRef.current;
                    if (stoppedLayoutForDragRef.current && lc) {
                        lc.start();
                        stoppedLayoutForDragRef.current = false;
                    }
                }
            },
        });
    }, [registerEvents, sigma]);

    return null;
}

function GraphControls() {
    const layout = useContext(LayoutContext);
    const {
        zoomIn,
        zoomOut,
        reset: resetCamera,
    } = useCamera({ duration: 200, factor: 1.5 });
    const { toggle: toggleFullScreen, isFullScreen } = useFullScreen();

    return (
        <>
            <ButtonGroup aria-label='Zoom' orientation='vertical'>
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => zoomIn()}
                    title='Zoom in'
                >
                    <AiOutlineZoomIn />
                </Button>
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => zoomOut()}
                    title='Zoom out'
                >
                    <AiOutlineZoomOut />
                </Button>
            </ButtonGroup>
            <ButtonGroup aria-label='View and layout' orientation='vertical'>
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => resetCamera()}
                    title='See whole graph'
                >
                    <MdFilterCenterFocus />
                </Button>
                {document.fullscreenEnabled && (
                    <Button
                        type='button'
                        variant='outline'
                        size='icon-sm'
                        className='text-foreground'
                        onClick={toggleFullScreen}
                        title={isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                        {isFullScreen ? (
                            <AiOutlineFullscreenExit />
                        ) : (
                            <AiOutlineFullscreen />
                        )}
                    </Button>
                )}
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() =>
                        layout?.isRunning ? layout.stop() : layout?.start()
                    }
                    title={layout?.isRunning ? 'Stop layout' : 'Start layout'}
                >
                    {layout?.isRunning ? <AiFillPauseCircle /> : <AiFillPlayCircle />}
                </Button>
            </ButtonGroup>
        </>
    );
}

function GraphScene({
    validNodes,
    linksData,
    idToNode,
    config,
    selectedNodes,
    setSelectedNodes,
    onTogglePanel,
    activePanel,
}: SigmaGraphBindingsProps) {
    const denseLinks = linksData.length >= LARGE_GRAPH_EDGES;
    const large = denseLinks || validNodes.length >= LARGE_GRAPH_NODES;
    const fa2RunningRef = useRef(false);
    const fa2Params = useMemo(
        () => buildForceAtlas2Params(config, validNodes.length, large),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit simulation keys only (not whole `config`)
        [
            validNodes.length,
            large,
            config.simulationFriction,
            config.simulationRepulsion,
            config.simulationGravity,
            config.simulationLinkSpring,
            config.simulationLinkDistance,
            config.simulationCluster,
        ],
    );

    return (
        <>
            <SigmaGraphThemeColors large={large} denseLinks={denseLinks} />
            <SigmaGraphologyLoader
                validNodes={validNodes}
                linksData={linksData}
                config={config}
            />
            <SigmaHoverFocus />
            {/* The minimap renders the whole graph a second time, and rebuilds it as the camera moves. */}
            {!large && (
                <ControlsContainer
                    position='top-right'
                    className='!border-border !bg-background/90 !rounded-lg'
                >
                    <MiniMap width='120px' height='120px' />
                </ControlsContainer>
            )}
            {/* Only on Start: the graph is laid out already (see entityLayout). Remounted on new parameters, as
                @react-sigma's worker hook keeps the settings it was created with. */}
            <ForceAtlas2Runner
                key={JSON.stringify(fa2Params)}
                params={fa2Params}
                runningRef={fa2RunningRef}
            >
                <SigmaGraphEvents
                    idToNode={idToNode}
                    selectedNodes={selectedNodes}
                    setSelectedNodes={setSelectedNodes}
                    onTogglePanel={onTogglePanel}
                    activePanel={activePanel}
                />
                <ControlsContainer
                    position='bottom-right'
                    className='!border-0 !bg-transparent !p-0 flex flex-col gap-2'
                >
                    <GraphControls />
                </ControlsContainer>
            </ForceAtlas2Runner>
        </>
    );
}

/** ForceAtlas2 behind the Start/Stop button: runs until paused, and stops on unmount. */
function ForceAtlas2Runner({
    params,
    runningRef,
    children,
}: {
    params: ForceAtlas2LayoutParameters;
    /** Whether ForceAtlas2 was started (and not stopped since), kept by the parent so a remount carries on. */
    runningRef: RefObject<boolean>;
    children: ReactNode;
}) {
    const { start, stop, isRunning } = useWorkerLayoutForceAtlas2(params);
    const layoutContextValue = useMemo(
        () => ({
            start: () => {
                runningRef.current = true;
                start();
            },
            stop: () => {
                runningRef.current = false;
                stop();
            },
            isRunning,
        }),
        [start, stop, isRunning, runningRef],
    );

    useEffect(() => {
        if (runningRef.current) start();
        return stop;
    }, [start, stop, runningRef]);

    return (
        <LayoutContext.Provider value={layoutContextValue}>
            {children}
        </LayoutContext.Provider>
    );
}

export default function GraphViewer({
    selectedNodes,
    setSelectedNodes,
    config = {},
    nodes = [],
    edges = [],
    onClearGraph: _onClearGraph,
    activePanel = null,
    onTogglePanel,
    sigmaRef: externalSigmaRef,
    isLoading = false,
    fetchProgress = null,
    fetchControls = null,
}: GraphViewerProps) {
    const internalSigmaRef = useRef<{ sigma: Sigma } | null>(null);
    const sigmaRef = externalSigmaRef || internalSigmaRef;

    const validNodes = useMemo(() => {
        return nodes.filter((node) => {
            const isValid = node.id != null && node.id !== '';
            if (!isValid) logger.warn('Skipping graph node without id', { node });
            return isValid;
        });
    }, [nodes]);

    const nodeIdToIndex = useMemo(() => {
        const map = new Map<string, number>();
        validNodes.forEach((node, index) => map.set(node.id, index));
        return map;
    }, [validNodes]);

    const idToNode = useMemo(() => {
        const map = new Map<string, Node>();
        validNodes.forEach((node) => map.set(node.id, node));
        return map;
    }, [validNodes]);

    const linksData = useMemo(() => {
        return edges
            .filter((edge) => {
                const sourceIndex = nodeIdToIndex.get(edge.source);
                const targetIndex = nodeIdToIndex.get(edge.target);
                return sourceIndex !== undefined && targetIndex !== undefined;
            })
            .map((edge) => ({
                ...edge,
                _sourceIndex: nodeIdToIndex.get(edge.source)!,
                _targetIndex: nodeIdToIndex.get(edge.target)!,
            }));
    }, [edges, nodeIdToIndex]);

    const hasNodes = validNodes.length > 0;

    const sigmaContainerSettings = useMemo(
        () => ({
            allowInvalidContainer: true as const,
            edgeProgramClasses: SIGMA_EDGE_PROGRAM_CLASSES,
            renderLabels: false,
        }),
        [],
    );

    return (
        <div className='w-full h-full bg-background relative overflow-hidden'>
            {hasNodes ? (
                <>
                    <div className='absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-md text-xs'>
                        <span className='text-muted-foreground'>
                            <span className='font-medium text-foreground'>
                                {validNodes.length}
                            </span>{' '}
                            nodes
                        </span>
                        <span className='text-muted-foreground'>
                            <span className='font-medium text-foreground'>
                                {linksData.length}
                            </span>{' '}
                            edges
                        </span>
                    </div>

                    <div className='absolute top-2 left-2 z-10 flex flex-col gap-1'>
                        {onTogglePanel && (
                            <>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className={
                                        activePanel === 'explorer'
                                            ? 'border-primary'
                                            : undefined
                                    }
                                    title='Toggle explorer panel'
                                    onClick={() => onTogglePanel('explorer')}
                                >
                                    <MagnifyingGlassIcon weight='bold' />
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className={
                                        activePanel === 'display'
                                            ? 'border-primary'
                                            : undefined
                                    }
                                    title='Toggle display panel'
                                    onClick={() => onTogglePanel('display')}
                                >
                                    <GearIcon weight='bold' />
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className={
                                        activePanel === 'filters'
                                            ? 'border-primary'
                                            : undefined
                                    }
                                    title='Toggle filters panel'
                                    onClick={() => onTogglePanel('filters')}
                                >
                                    <FunnelIcon weight='bold' />
                                </Button>
                            </>
                        )}
                    </div>

                    <div
                        className='h-full w-full rounded-lg'
                        style={
                            {
                                ['--sigma-background-color']: 'var(--background)',
                            } as CSSProperties
                        }
                    >
                        <SigmaContainer
                            id='sigma-graph-viewer'
                            graph={MultiDirectedGraph}
                            settings={sigmaContainerSettings}
                            style={{
                                height: '100%',
                                width: '100%',
                                minHeight: 0,
                            }}
                            className='rounded-lg'
                        >
                            {sigmaRef && <SetSigmaRef sigmaRef={sigmaRef} />}
                            <GraphScene
                                validNodes={validNodes}
                                linksData={linksData}
                                idToNode={idToNode}
                                config={config}
                                selectedNodes={selectedNodes}
                                setSelectedNodes={setSelectedNodes}
                                onTogglePanel={onTogglePanel}
                                activePanel={activePanel}
                            />
                        </SigmaContainer>
                    </div>
                </>
            ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground'>
                    <div className='text-center'>
                        {isLoading ? (
                            <>
                                <Spinner className='size-10 mx-auto mb-3' />
                                <p className='text-lg'>Loading</p>
                                <p className='text-sm mt-1'>Downloading data…</p>
                                {fetchProgress != null &&
                                    fetchProgress.totalPages > 0 && (
                                        <p className='text-sm mt-2 text-muted-foreground tabular-nums'>
                                            Page {fetchProgress.currentPage} of{' '}
                                            {fetchProgress.totalPages}
                                            {fetchProgress.isPaused ? ' · paused' : ''}
                                        </p>
                                    )}
                                {fetchControls != null && (
                                    <div className='flex gap-2 mt-4 justify-center'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => fetchControls.pause()}
                                            disabled={
                                                fetchProgress != null &&
                                                fetchProgress.isPaused
                                            }
                                        >
                                            Pause
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => fetchControls.resume()}
                                            disabled={
                                                fetchProgress != null &&
                                                !fetchProgress.isPaused
                                            }
                                        >
                                            Resume
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <p className='text-lg mb-2'>No graph data available</p>
                                <p className='text-sm'>
                                    Add nodes to visualize the graph
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
