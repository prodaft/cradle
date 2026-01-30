import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/contexts/ui/ThemeContext';
import { logger } from '@/utils/logger';
import {
    FunnelIcon,
    GearIcon,
    MagnifyingGlassIcon,
    PauseIcon,
    PlayIcon,
} from '@phosphor-icons/react';
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
import Graph from 'graphology';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { Edge, Node } from './graphFilterUtils';

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
    sigmaRef?: React.RefObject<{ sigma: Sigma } | null>;
    isLoading?: boolean;
    fetchProgress?: FetchProgress | null;
    fetchControls?: FetchControls | null;
}

function normalize(x: number, inputMin: number, inputMax: number): number {
    x = Math.min(x, inputMax);
    x = Math.max(x, inputMin);
    const outputMin = 15;
    const outputMax = 40;
    const shifted = x - inputMin + 1;
    const maxShifted = inputMax - inputMin + 1;
    const normalized = shifted / maxShifted;
    return outputMin + normalized * (outputMax - outputMin);
}

interface ForceAtlas2LayoutContextValue {
    stop: () => void;
    start: () => void;
    isRunning: boolean;
}

const ForceAtlas2LayoutContext = createContext<ForceAtlas2LayoutContextValue | null>(
    null,
);

function SetSigmaRef({
    sigmaRef,
}: {
    sigmaRef: React.RefObject<{ sigma: Sigma } | null>;
}) {
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

interface GraphContentProps {
    validNodes: Node[];
    linksData: Array<Edge & { _sourceIndex: number; _targetIndex: number }>;
    idToNode: Map<string, Node>;
    config: GraphConfig;
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    onTogglePanel?: (panel: 'explorer' | 'display' | 'filters') => void;
    activePanel: 'explorer' | 'display' | 'filters' | null;
}

function GraphContent({
    validNodes,
    linksData,
    idToNode,
    config,
    selectedNodes,
    setSelectedNodes,
    onTogglePanel,
    activePanel,
}: GraphContentProps) {
    const loadGraph = useLoadGraph();
    const registerEvents = useRegisterEvents();
    const sigma = useSigma();
    const setSettings = useSetSettings();
    const layoutContext = useContext(ForceAtlas2LayoutContext);
    const [draggedNode, setDraggedNode] = useState<string | null>(null);
    const stoppedLayoutForDragRef = useRef(false);
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

    const themeSample = (
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

    const graph = useMemo(() => {
        const g = new Graph();
        const sizeCoef = config.nodeRadiusCoefficient ?? 1;
        validNodes.forEach((node) => {
            g.addNode(node.id, {
                x: Math.random() * 100 - 50,
                y: Math.random() * 100 - 50,
                size: normalize(node.degree ?? 1, 1, 60) * sizeCoef,
                label: node.label || node.id,
                color: node.color || 'var(--color-primary)',
            });
        });
        if (config.showLinks !== false) {
            linksData.forEach((edge) => {
                if (!g.hasEdge(edge.source, edge.target)) {
                    g.addEdge(edge.source, edge.target);
                }
            });
        }
        return g;
    }, [validNodes, linksData, config.showLinks, config.nodeRadiusCoefficient]);

    useEffect(() => {
        loadGraph(graph);
    }, [loadGraph, graph]);

    useEffect(() => {
        registerEvents({
            clickNode: (event) => {
                try {
                    const nodeKey = event.node;
                    const node = idToNode.get(nodeKey);
                    if (!node) return;
                    let newNodes = new Set<Node>([node]);
                    if (selectedNodes.has(node)) {
                        try {
                            const g = sigma.getGraph();
                            const neighbors = g.neighbors(nodeKey);
                            const neighborNodes = neighbors
                                .map((key) => idToNode.get(key))
                                .filter(Boolean) as Node[];
                            neighborNodes.unshift(node);
                            newNodes = new Set(neighborNodes);
                        } catch (e) {
                            logger.warn('[Graph] Error getting neighbors:', {
                                error: e,
                            });
                        }
                    }
                    setSelectedNodes(newNodes);
                    if (onTogglePanel && activePanel !== 'explorer') {
                        onTogglePanel('explorer');
                    }
                } catch (error) {
                    logger.error('[Graph] Error in clickNode:', error);
                }
            },
            clickStage: () => {
                setSelectedNodes(new Set());
            },
            clickEdge: (event) => {
                try {
                    const g = sigma.getGraph();
                    const [source, target] = g.extremities(event.edge);
                    const sourceNode = source ? idToNode.get(source) : undefined;
                    const targetNode = target ? idToNode.get(target) : undefined;
                    const newNodes = new Set<Node>();
                    if (sourceNode) newNodes.add(sourceNode);
                    if (targetNode) newNodes.add(targetNode);
                    setSelectedNodes(newNodes);
                    if (onTogglePanel && activePanel !== 'explorer') {
                        onTogglePanel('explorer');
                    }
                } catch (error) {
                    logger.error('[Graph] Error in clickEdge:', error);
                }
            },
            downNode: (event) => {
                setDraggedNode(event.node);
                sigma.getGraph().setNodeAttribute(event.node, 'highlighted', true);
                if (layoutContext?.isRunning) {
                    layoutContext.stop();
                    stoppedLayoutForDragRef.current = true;
                }
            },
            mousemovebody: (event) => {
                if (!draggedNode) return;
                const pos = sigma.viewportToGraph(event);
                sigma.getGraph().setNodeAttribute(draggedNode, 'x', pos.x);
                sigma.getGraph().setNodeAttribute(draggedNode, 'y', pos.y);
                event.preventSigmaDefault();
                event.original.preventDefault();
                event.original.stopPropagation();
            },
            mouseup: () => {
                if (draggedNode) {
                    setDraggedNode(null);
                    sigma.getGraph().removeNodeAttribute(draggedNode, 'highlighted');
                    if (stoppedLayoutForDragRef.current && layoutContext) {
                        layoutContext.start();
                        stoppedLayoutForDragRef.current = false;
                    }
                }
            },
            mousedown: () => {
                if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
            },
        });
    }, [
        registerEvents,
        sigma,
        idToNode,
        selectedNodes,
        setSelectedNodes,
        onTogglePanel,
        activePanel,
        draggedNode,
        layoutContext,
    ]);

    return themeSample;
}

interface GraphSceneProps extends GraphContentProps {
    faTime: number;
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
    faTime,
    validNodes,
    linksData,
    idToNode,
    config,
    selectedNodes,
    setSelectedNodes,
    onTogglePanel,
    activePanel,
}: GraphSceneProps) {
    const sigma = useSigma();
    const layout = useWorkerLayoutForceAtlas2();
    const layoutContextValue = useMemo(
        () => ({
            stop: layout.stop,
            start: layout.start,
            isRunning: layout.isRunning,
        }),
        [layout.stop, layout.start, layout.isRunning],
    );

    useEffect(() => {
        if (!sigma || faTime === undefined || faTime <= -1) return;
        if (sigma.getGraph().order === 0) return;
        layout.start();
        const timeout =
            faTime > 0 ? window.setTimeout(() => layout.stop(), faTime) : null;
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [sigma, faTime, layout.start, layout.stop]);

    return (
        <ForceAtlas2LayoutContext.Provider value={layoutContextValue}>
            <GraphContent
                validNodes={validNodes}
                linksData={linksData}
                idToNode={idToNode}
                config={config}
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
    onClearGraph,
    activePanel = null,
    onTogglePanel,
    sigmaRef: externalSigmaRef,
    isLoading = false,
    fetchProgress = null,
    fetchControls = null,
}: GraphViewerProps) {
    const internalSigmaRef = useRef<{ sigma: ReturnType<typeof useSigma> } | null>(
        null,
    );
    const sigmaRef = externalSigmaRef || internalSigmaRef;
    const [faTime, setFaTime] = useState<number>(2000);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const time = params.get('faTime');
        setFaTime(Number.parseInt(time ?? '2000', 10) || 2000);
    }, []);

    const validNodes = useMemo(() => {
        return nodes.filter((node) => {
            const isValid = node.id != null && node.id !== '';
            if (!isValid) logger.warn('[Graph] Filtered out invalid node:', { node });
            return isValid;
        });
    }, [nodes]);

    const nodeIdToIndex = useMemo(() => {
        const map = new Map<string, number>();
        validNodes.forEach((node, index) => map.set(node.id, index));
        return map;
    }, [validNodes]);

    const indexToNode = useMemo(() => {
        const map = new Map<number, Node>();
        validNodes.forEach((node, index) => map.set(index, node));
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
                        {fetchProgress && (
                            <>
                                <span className='text-border'>|</span>
                                <Spinner className='size-10' />
                                <span className='text-muted-foreground'>
                                    {fetchProgress.currentPage}/
                                    {fetchProgress.totalPages}
                                    {fetchProgress.isPaused && ' (paused)'}
                                </span>
                                {fetchControls && (
                                    <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-5'
                                        onClick={() => {
                                            if (fetchProgress.isPaused) {
                                                fetchControls.resume();
                                            } else {
                                                fetchControls.pause();
                                            }
                                        }}
                                        title={
                                            fetchProgress.isPaused
                                                ? 'Resume loading'
                                                : 'Pause loading'
                                        }
                                    >
                                        {fetchProgress.isPaused ? (
                                            <PlayIcon
                                                className='size-3'
                                                weight='fill'
                                            />
                                        ) : (
                                            <PauseIcon
                                                className='size-3'
                                                weight='fill'
                                            />
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
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
                            } as React.CSSProperties
                        }
                    >
                        <SigmaContainer
                            style={{ height: '100%', width: '100%' }}
                            className='rounded-lg'
                        >
                            {sigmaRef && <SetSigmaRef sigmaRef={sigmaRef} />}
                            <GraphScene
                                faTime={faTime}
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
                                <p className='text-lg'>Loading graph data...</p>
                                {fetchProgress && (
                                    <p className='text-sm mt-1'>
                                        Page {fetchProgress.currentPage} of{' '}
                                        {fetchProgress.totalPages}
                                        {fetchProgress.isPaused && ' (paused)'}
                                    </p>
                                )}
                                {fetchControls && fetchProgress && (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='mt-3'
                                        onClick={() => {
                                            if (fetchProgress.isPaused) {
                                                fetchControls.resume();
                                            } else {
                                                fetchControls.pause();
                                            }
                                        }}
                                    >
                                        {fetchProgress.isPaused ? (
                                            <>
                                                <PlayIcon
                                                    className='size-4 mr-1'
                                                    weight='fill'
                                                />
                                                Resume
                                            </>
                                        ) : (
                                            <>
                                                <PauseIcon
                                                    className='size-4 mr-1'
                                                    weight='fill'
                                                />
                                                Pause
                                            </>
                                        )}
                                    </Button>
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
