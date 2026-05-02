import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/contexts/ui/theme-context';
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
import { MultiDirectedGraph } from 'graphology';
import type { ForceAtlas2LayoutParameters } from 'graphology-layout-forceatlas2';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type CSSProperties,
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
import { Edge, Node } from './graph-filter-utils';

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
    simulationDecay?: number;
    randomSeed?: string | number;
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

interface ForceAtlas2LayoutContextValue {
    stop: () => void;
    start: () => void;
    isRunning: boolean;
}

const ForceAtlas2LayoutContext = createContext<ForceAtlas2LayoutContextValue | null>(
    null,
);

/** Deterministic [0,1) floats from display settings seed (initial node placement). */
function createSeededRng(seed: string | number | undefined): () => number {
    let state =
        typeof seed === 'number' && Number.isFinite(seed)
            ? Math.floor(Math.abs(seed)) % 2147483646 || 1
            : typeof seed === 'string' && seed.length > 0
              ? [...seed].reduce(
                    (h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0,
                    0,
                ) >>> 0
              : 88675123;
    if (state === 0) state = 88675123;
    return () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function buildForceAtlas2Params(
    config: GraphConfig,
    nodeCount: number,
): ForceAtlas2LayoutParameters {
    const friction = config.simulationFriction ?? 0.75;
    const repulsion = config.simulationRepulsion ?? 1.6;
    const gravity = config.simulationGravity ?? 0.15;
    const linkSpring = config.simulationLinkSpring ?? 0.6;
    const linkDistance = config.simulationLinkDistance ?? 16;
    const decay = config.simulationDecay ?? 10000;

    // Tighter preferred link distance → slightly calmer global repulsion (helps hub jitter).
    const linkTightness = Math.sqrt(Math.min(24, Math.max(4, linkDistance)) / 16);
    // Higher decay (UI “stabilize faster”) → modest extra damping in FA2.
    const decayBoost = 0.85 + Math.min(0.35, (decay - 1000) / 14000);
    // Cluster separation nudges repulsion (no FA2-native “cluster” knob).
    const cluster = config.simulationCluster ?? 0.1;
    const clusterScale = 1 + cluster * 0.35;

    return {
        settings: {
            // FA2 default slowDown is 1 (very twitchy); higher values calm high-degree hubs.
            slowDown: (2 + friction * 10) * decayBoost,
            scalingRatio: Math.max(
                0.12,
                repulsion * 0.48 * linkTightness * clusterScale,
            ),
            gravity: Math.max(0.02, gravity * 3),
            strongGravityMode: gravity >= 0.12,
            outboundAttractionDistribution: true,
            barnesHutOptimize: nodeCount >= 80,
            barnesHutTheta: 0.85,
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

function SigmaGraphThemeColors() {
    const setSettings = useSetSettings();
    const edgeColorRef = useRef<HTMLDivElement | null>(null);
    const labelColorRef = useRef<HTMLDivElement | null>(null);
    const { isDarkMode } = useTheme();

    useEffect(() => {
        const edgeEl = edgeColorRef.current;
        const labelEl = labelColorRef.current;
        const edgeColor = edgeEl
            ? getComputedStyle(edgeEl).color
            : isDarkMode
              ? 'rgba(200, 200, 200, 0.9)'
              : 'rgba(100, 100, 100, 0.9)';
        const labelColor = labelEl
            ? getComputedStyle(labelEl).color
            : isDarkMode
              ? 'rgb(240, 240, 240)'
              : 'rgb(20, 20, 20)';
        setSettings({
            enableEdgeEvents: true,
            defaultEdgeColor: edgeColor,
            defaultNodeColor: 'var(--color-primary)',
            labelColor: { color: labelColor },
            edgeLabelColor: { color: 'var(--color-muted-foreground)' },
        });
    }, [setSettings, isDarkMode]);

    return (
        <>
            <div
                ref={edgeColorRef}
                aria-hidden
                className='pointer-events-none absolute opacity-0 text-muted-foreground'
            />
            <div
                ref={labelColorRef}
                aria-hidden
                className='pointer-events-none absolute opacity-0 text-foreground'
            />
        </>
    );
}

function SigmaGraphologyLoader({
    validNodes,
    linksData,
    config,
}: Pick<SigmaGraphBindingsProps, 'validNodes' | 'linksData' | 'config'>) {
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    useEffect(() => {
        const currentGraph = sigma.getGraph();
        if (currentGraph.order > 0) {
            currentGraph.forEachNode((nodeId, attrs) => {
                if (typeof attrs.x === 'number' && typeof attrs.y === 'number') {
                    positionsRef.current.set(String(nodeId), {
                        x: attrs.x,
                        y: attrs.y,
                    });
                }
            });
        }

        const sizeCoef = config.nodeRadiusCoefficient ?? 1;
        const rnd = createSeededRng(config.randomSeed);
        const g = new MultiDirectedGraph();
        validNodes.forEach((node) => {
            const saved = positionsRef.current.get(node.id);
            const x = saved?.x ?? rnd() * 100 - 50;
            const y = saved?.y ?? rnd() * 100 - 50;
            positionsRef.current.set(node.id, { x, y });
            g.addNode(node.id, {
                x,
                y,
                size: 10 * sizeCoef,
                label: node.label || node.id,
                color: node.color || 'var(--color-primary)',
            });
        });
        if (config.showLinks !== false) {
            linksData.forEach((edge) => {
                const edgeKey =
                    edge.id != null && String(edge.id) !== '' ? String(edge.id) : null;
                if (edgeKey) {
                    if (!g.hasEdge(edgeKey)) {
                        g.addEdgeWithKey(edgeKey, edge.source, edge.target);
                    }
                } else if (!g.hasEdge(edge.source, edge.target)) {
                    g.addEdge(edge.source, edge.target);
                }
            });
        }
        loadGraph(g, true);
    }, [
        loadGraph,
        sigma,
        validNodes,
        linksData,
        config.showLinks,
        config.nodeRadiusCoefficient,
        config.randomSeed,
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
    const layoutContext = useContext(ForceAtlas2LayoutContext);
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
                    const lc = layoutContextRef.current;
                    if (stoppedLayoutForDragRef.current && lc) {
                        lc.start();
                        stoppedLayoutForDragRef.current = false;
                    }
                }
            },
            mousedown: () => {
                if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
            },
        });
    }, [registerEvents, sigma]);

    return null;
}

function GraphControls({
    layout,
}: {
    layout: ReturnType<typeof useWorkerLayoutForceAtlas2>;
}) {
    const { zoomIn, zoomOut, reset } = useCamera({ duration: 200, factor: 1.5 });
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
                    <AiOutlineZoomIn className='size-4 text-foreground' />
                </Button>
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => zoomOut()}
                    title='Zoom out'
                >
                    <AiOutlineZoomOut className='size-4 text-foreground' />
                </Button>
            </ButtonGroup>
            <ButtonGroup aria-label='View and layout' orientation='vertical'>
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => reset()}
                    title='See whole graph'
                >
                    <MdFilterCenterFocus className='size-4 text-foreground' />
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
                            <AiOutlineFullscreenExit className='size-4 text-foreground' />
                        ) : (
                            <AiOutlineFullscreen className='size-4 text-foreground' />
                        )}
                    </Button>
                )}
                <Button
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    className='text-foreground'
                    onClick={() => (layout.isRunning ? layout.stop() : layout.start())}
                    title={layout.isRunning ? 'Stop layout' : 'Start layout'}
                >
                    {layout.isRunning ? (
                        <AiFillPauseCircle className='size-4 text-foreground' />
                    ) : (
                        <AiFillPlayCircle className='size-4 text-foreground' />
                    )}
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
    const sigma = useSigma();
    // Only simulation-related `config` fields affect FA2; list them explicitly so unrelated `config` keys do not reset the worker.
    const fa2Params = useMemo(
        () => buildForceAtlas2Params(config, validNodes.length),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit simulation keys only (not whole `config`)
        [
            validNodes.length,
            config.simulationFriction,
            config.simulationRepulsion,
            config.simulationGravity,
            config.simulationLinkSpring,
            config.simulationLinkDistance,
            config.simulationDecay,
            config.simulationCluster,
        ],
    );
    const layout = useWorkerLayoutForceAtlas2(fa2Params);
    const layoutContextValue = useMemo(
        () => ({
            stop: layout.stop,
            start: layout.start,
            isRunning: layout.isRunning,
        }),
        [layout.stop, layout.start, layout.isRunning],
    );

    useEffect(() => {
        if (!sigma || sigma.getGraph().order === 0) return;
        layout.start();
        return () => {
            layout.stop();
        };
    }, [sigma, layout.start, layout.stop]); // eslint-disable-line react-hooks/exhaustive-deps -- stable `layout.start`/`layout.stop` only

    return (
        <ForceAtlas2LayoutContext.Provider value={layoutContextValue}>
            <SigmaGraphThemeColors />
            <SigmaGraphologyLoader
                validNodes={validNodes}
                linksData={linksData}
                config={config}
            />
            <SigmaGraphEvents
                idToNode={idToNode}
                selectedNodes={selectedNodes}
                setSelectedNodes={setSelectedNodes}
                onTogglePanel={onTogglePanel}
                activePanel={activePanel}
            />
            <ControlsContainer
                position='top-right'
                className='!border-border !bg-background/90 !rounded-lg'
            >
                <MiniMap width='120px' height='120px' />
            </ControlsContainer>
            <ControlsContainer
                position='bottom-right'
                className='!border-0 !bg-transparent !p-0 flex flex-col gap-2'
            >
                <GraphControls layout={layout} />
            </ControlsContainer>
        </ForceAtlas2LayoutContext.Provider>
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

    const hasValidData = validNodes.length > 0;

    return (
        <div className='w-full h-full bg-background relative overflow-hidden'>
            {hasValidData ? (
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
                                    className={`p-1.5 w-8 h-8 ${activePanel === 'explorer' ? 'border-primary' : ''}`}
                                    title='Toggle explorer panel'
                                    onClick={() => onTogglePanel('explorer')}
                                >
                                    <MagnifyingGlassIcon size={16} weight='bold' />
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className={`p-1.5 w-8 h-8 ${activePanel === 'display' ? 'border-primary' : ''}`}
                                    title='Toggle display panel'
                                    onClick={() => onTogglePanel('display')}
                                >
                                    <GearIcon size={16} weight='bold' />
                                </Button>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className={`p-1.5 w-8 h-8 ${activePanel === 'filters' ? 'border-primary' : ''}`}
                                    title='Toggle filters panel'
                                    onClick={() => onTogglePanel('filters')}
                                >
                                    <FunnelIcon size={16} weight='bold' />
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
                            settings={{ allowInvalidContainer: true }}
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
