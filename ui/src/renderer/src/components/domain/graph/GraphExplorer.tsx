import { useNotif } from '@/contexts/ui/NotificationContext';
import { EdgeRelation } from '@/services/cradle';
import InProgress from '@components/feedback/InProgress';
import { CosmographProvider } from '@cosmograph/react';
import { ComponentType, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Graph from './Graph';
import { filterGraph, Node } from './graphFilterUtils';
import GraphQuery from './GraphQuery';

export type LayoutMode = 'circular' | 'grid' | 'cluster' | 'random';

interface GraphConfig {
    nodeRadiusCoefficient: number;
    linkWidthCoefficient: number;
    layoutMode: LayoutMode;
}

interface SearchComponentProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
}

interface GraphExplorerProps {
    GraphSearchComponent: ComponentType<SearchComponentProps>;
}

export default function GraphExplorer({ GraphSearchComponent }: GraphExplorerProps) {
    if (import.meta.env.VITE_ENV === 'production') {
        return <InProgress />;
    }

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<EdgeRelation[]>([]);
    const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());
    const [entryGraphColors, setEntryGraphColors] = useState<Record<string, string>>(
        {},
    );
    const [config, setConfig] = useState<GraphConfig>({
        nodeRadiusCoefficient: 1,
        linkWidthCoefficient: 1,
        layoutMode: 'circular',
    });
    const { notify } = useNotif();
    const [selectedNodes, setSelectedNodes] = useState<Set<Node>>(new Set());
    const [activePanel, setActivePanel] = useState<'explorer' | 'display' | null>(null);
    const cosmographRef = useRef<any>(null);

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
                console.warn('[GraphExplorer] Node missing id:', node);
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
                console.warn(
                    '[GraphExplorer] Edge missing required properties (id, src, dst):',
                    edge,
                );
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
                console.warn(
                    `[GraphExplorer] Edge references non-existent node(s). Edge: ${edge.id}, ` +
                        `src: ${edge.src} (exists: ${srcExists}), dst: ${edge.dst} (exists: ${dstExists}). ` +
                        `Available node IDs: ${Array.from(allNodeIds).join(', ')}`,
                );
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

    return (
        <CosmographProvider>
            <div className='w-full h-full overflow-y-hidden relative'>
                <PanelGroup direction='horizontal' className='h-full'>
                    {/* Always render panel but hide it when closed */}
                    <Panel
                        defaultSize={30}
                        minSize={20}
                        maxSize={50}
                        className={activePanel ? '' : 'hidden'}
                    >
                        <GraphQuery
                            selectedEntries={selectedNodes}
                            setSelectedEntries={setSelectedNodes}
                            config={config}
                            setConfig={setConfig}
                            SearchComponent={GraphSearchComponent}
                            entryGraphColors={entryGraphColors}
                            disabledTypes={disabledTypes}
                            setDisabledTypes={setDisabledTypes}
                            addNodes={addNodes}
                            addEdges={addEdges}
                            addBoth={addBoth}
                            nodes={filteredNodes}
                            edges={filteredEdges}
                            activePanel={activePanel || 'explorer'}
                            onClosePanel={() => setActivePanel(null)}
                            cosmographRef={cosmographRef}
                        />
                    </Panel>
                    {activePanel && (
                        <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                    )}
                    <Panel defaultSize={activePanel ? 70 : 100} minSize={50}>
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
                                cosmographRef={cosmographRef}
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </CosmographProvider>
    );
}
