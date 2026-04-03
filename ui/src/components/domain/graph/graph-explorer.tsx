import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { logger } from '@/utils/logger';
import { ComponentType, useCallback, useMemo, useRef, useState } from 'react';
import type Sigma from 'sigma';
import Graph from './graph';
import GraphQuery from './graph-query';
import { type EdgeRelation, filterGraph, type Node } from './graphFilterUtils';

interface GraphConfig {
    nodeRadiusCoefficient: number;
    linkWidthCoefficient: number;
    showLinks?: boolean;
    curvedLinks?: boolean;
    scaleLinksOnZoom?: boolean;
    showLinkWidthLegend?: boolean;
    simulationGravity: number;
    simulationRepulsion: number;
    simulationLinkSpring: number;
    simulationLinkDistance: number;
    simulationFriction: number;
    simulationCluster: number;
    simulationDecay: number;
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

interface SearchComponentProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: FetchControls) => void;
}

interface GraphExplorerProps {
    GraphSearchComponent: ComponentType<SearchComponentProps>;
}

export default function GraphExplorer({ GraphSearchComponent }: GraphExplorerProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<EdgeRelation[]>([]);
    const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());
    const [entryGraphColors, setEntryGraphColors] = useState<Record<string, string>>(
        {},
    );
    const [config, setConfig] = useState<GraphConfig>({
        nodeRadiusCoefficient: 1,
        linkWidthCoefficient: 1,
        showLinks: true,
        curvedLinks: false,
        scaleLinksOnZoom: false,
        showLinkWidthLegend: false,
        simulationGravity: 0.15,
        simulationRepulsion: 1.6,
        simulationLinkSpring: 0.6,
        simulationLinkDistance: 16,
        simulationFriction: 0.75,
        simulationCluster: 0.1,
        simulationDecay: 10000,
        randomSeed: 42,
    });
    const [selectedNodes, setSelectedNodes] = useState<Set<Node>>(new Set());
    const [activePanel, setActivePanel] = useState<
        'explorer' | 'display' | 'filters' | null
    >(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null);
    const [fetchControls, setFetchControls] = useState<FetchControls | null>(null);
    const sigmaRef = useRef<{ sigma: Sigma } | null>(null);

    const handleLoadingChange = useCallback((loading: boolean) => {
        setIsLoading(loading);
    }, []);

    const handleFetchProgressChange = useCallback((progress: FetchProgress | null) => {
        setFetchProgress(progress);
    }, []);

    const handleFetchControlsReady = useCallback((controls: FetchControls) => {
        setFetchControls(controls);
    }, []);

    // Maintain sets for tracking existing IDs
    const [nodeIds, setNodeIds] = useState<Set<string>>(new Set());
    const [edgeIds, setEdgeIds] = useState<Set<string>>(new Set());

    /**
     * Add nodes and edges atomically to prevent race conditions.
     * This ensures edges are only added after their corresponding nodes exist.
     */
    const addNodesAndEdges = (
        newNodes: Node[] | Node,
        newEdges: EdgeRelation[] | EdgeRelation,
    ) => {
        const nodesToProcess = Array.isArray(newNodes) ? newNodes : [newNodes];
        const edgesToProcess = Array.isArray(newEdges) ? newEdges : [newEdges];

        // Filter valid nodes
        const nodesToAdd = nodesToProcess.filter((node) => {
            if (!node.id) {
                logger.warn('Skipping graph node without id', { node });
                return false;
            }
            return !nodeIds.has(node.id);
        });

        // Create a set of all node IDs (existing + new)
        const allNodeIds = new Set([...nodeIds, ...nodesToAdd.map((n) => n.id)]);

        // Filter valid edges (must reference existing or new nodes)
        const edgesToAdd = edgesToProcess.filter((edge) => {
            // Validate required properties
            if (!edge.id || edge.src == null || edge.dst == null) {
                logger.warn('Skipping graph edge with missing id, src, or dst', {
                    edge,
                });
                return false;
            }

            // Check for duplicates
            if (edgeIds.has(edge.id)) {
                return false;
            }

            // Convert edge src/dst to strings for comparison (nodes have string IDs)
            const srcStr = String(edge.src);
            const dstStr = String(edge.dst);

            // Validate that both source and destination nodes exist or will exist
            const srcExists = allNodeIds.has(srcStr);
            const dstExists = allNodeIds.has(dstStr);

            if (!srcExists || !dstExists) {
                logger.warn('Skipping graph edge with unknown endpoint', {
                    edgeId: edge.id,
                    src: edge.src,
                    dst: edge.dst,
                    srcExists,
                    dstExists,
                    availableNodeIds: Array.from(allNodeIds),
                });
                return false;
            }

            return true;
        });

        // Update all state atomically
        if (nodesToAdd.length > 0 || edgesToAdd.length > 0) {
            if (nodesToAdd.length > 0) {
                setNodes((prevNodes) => [...prevNodes, ...nodesToAdd]);
                setNodeIds((prevIds) => {
                    const newIds = new Set(prevIds);
                    nodesToAdd.forEach((node) => newIds.add(node.id));
                    return newIds;
                });
                setEntryGraphColors((prevColors) => {
                    const newColors = { ...prevColors };
                    nodesToAdd.forEach((node) => {
                        if (node.subtype && node.color && !newColors[node.subtype]) {
                            newColors[node.subtype] = node.color;
                        }
                    });
                    return newColors;
                });
            }

            if (edgesToAdd.length > 0) {
                setEdges((prevEdges) => [...prevEdges, ...edgesToAdd]);
                setEdgeIds((prevIds) => {
                    const newIds = new Set(prevIds);
                    edgesToAdd.forEach((edge) => edge.id && newIds.add(edge.id));
                    return newIds;
                });
            }
        }
    };

    const addNodes = (newNodes: Node[] | Node) => {
        const nodesToProcess = Array.isArray(newNodes) ? newNodes : [newNodes];
        addNodesAndEdges(nodesToProcess, []);
    };

    const addEdges = (newEdges: EdgeRelation[] | EdgeRelation) => {
        const edgesToProcess = Array.isArray(newEdges) ? newEdges : [newEdges];
        addNodesAndEdges([], edgesToProcess);
    };

    /**
     * Add both nodes and edges together atomically.
     * This is the preferred method when you have both nodes and edges to add.
     */
    const addBoth = (
        newNodes: Node[] | Node,
        newEdges: EdgeRelation[] | EdgeRelation,
    ) => {
        const nodesToProcess = Array.isArray(newNodes) ? newNodes : [newNodes];
        const edgesToProcess = Array.isArray(newEdges) ? newEdges : [newEdges];
        addNodesAndEdges(nodesToProcess, edgesToProcess);
    };

    // Filter nodes and edges based on disabled types
    const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
        const { nodes: filteredNodes, edges: filteredEdges } = filterGraph(
            nodes,
            edges,
            disabledTypes,
        );
        return {
            nodes: filteredNodes,
            edges: filteredEdges.map((edge) => ({
                ...edge,
                source: edge.src.toString(),
                target: edge.dst.toString(),
            })),
        };
    }, [nodes, edges, disabledTypes]);

    const graphQueryProps = {
        selectedEntries: selectedNodes,
        setSelectedEntries: setSelectedNodes,
        config,
        setConfig,
        SearchComponent: GraphSearchComponent,
        entryGraphColors,
        disabledTypes,
        setDisabledTypes,
        addNodes,
        addEdges,
        addBoth,
        nodes: filteredNodes,
        edges: filteredEdges,
        activePanel: (activePanel ?? 'explorer') as 'explorer' | 'display' | 'filters',
        onClosePanel: () => setActivePanel(null),
        sigmaRef,
        onLoadingChange: handleLoadingChange,
        onFetchProgressChange: handleFetchProgressChange,
        onFetchControlsReady: handleFetchControlsReady,
    };

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            {/* Mount search when panel is closed so graph data still loads */}
            {!activePanel && (
                <div className='sr-only' aria-hidden>
                    <GraphQuery {...graphQueryProps} />
                </div>
            )}
            <ResizablePanelGroup orientation='horizontal' className='h-full'>
                {activePanel && (
                    <>
                        <ResizablePanel defaultSize='30%' minSize='20%' maxSize='50%'>
                            <GraphQuery {...graphQueryProps} />
                        </ResizablePanel>
                        <ResizableHandle className='w-[2px] bg-card border-x border-border hover:bg-primary hover:bg-opacity-50 transition-colors' />
                    </>
                )}
                <ResizablePanel
                    defaultSize={activePanel ? '70%' : '100%'}
                    minSize='50%'
                >
                    <div className='relative h-full'>
                        <Graph
                            selectedNodes={selectedNodes}
                            setSelectedNodes={setSelectedNodes}
                            onClearGraph={() => {
                                setNodes([]);
                                setEdges([]);
                                setNodeIds(new Set());
                                setEdgeIds(new Set());
                                setEntryGraphColors({});
                            }}
                            config={config}
                            nodes={filteredNodes}
                            edges={filteredEdges}
                            activePanel={activePanel}
                            onTogglePanel={(panel) =>
                                setActivePanel(activePanel === panel ? null : panel)
                            }
                            sigmaRef={sigmaRef}
                            isLoading={isLoading}
                            fetchProgress={fetchProgress}
                            fetchControls={fetchControls}
                        />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
