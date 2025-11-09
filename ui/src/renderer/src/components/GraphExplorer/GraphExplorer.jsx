import { useMemo, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import 'tailwindcss/tailwind.css';
import { useNotif } from '../../contexts/NotificationContext/NotificationContext';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';
import InProgress from '../InProgress/InProgress';
import { filterGraph } from './graphFilterUtils';

export default function GraphExplorer({ GraphSearchComponent }) {
    if (import.meta.env.VITE_ENV === 'production') {
        return <InProgress />;
    }

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [disabledTypes, setDisabledTypes] = useState(new Set());
    const [entryGraphColors, setEntryGraphColors] = useState({});
    const [config, setConfig] = useState({
        nodeRadiusCoefficient: 1,
        linkWidthCoefficient: 1,
        simulationGravity: 0.2,
        simulationRepulsion: 1.5,
        simulationLinkSpring: 0.5,
        simulationLinkDistance: 10,
    });
    const { notify } = useNotif();
    const [selectedEntries, setSelectedEntries] = useState(new Set());

    // Maintain sets for tracking existing IDs
    const [nodeIds, setNodeIds] = useState(new Set());
    const [edgeIds, setEdgeIds] = useState(new Set());

    const addNodes = (newNodes) => {
        if (!Array.isArray(newNodes)) {
            newNodes = [newNodes];
        }

        const nodesToAdd = newNodes.filter((node) => {
            if (!node.id) {
                console.warn('Node missing id:', node);
                return false;
            }
            return !nodeIds.has(node.id);
        });

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
                    if (node.type && node.color && !newColors[node.type]) {
                        newColors[node.type] = node.color;
                    }
                });
                return newColors;
            });
        }
    };

    const addEdges = (newEdges) => {
        if (!Array.isArray(newEdges)) {
            newEdges = [newEdges];
        }

        const edgesToAdd = newEdges.filter((edge) => {
            if (!edge.id || !edge.source || !edge.target) {
                console.warn(
                    'Edge missing required properties (id, source, target):',
                    edge,
                );
                return false;
            }

            if (edgeIds.has(edge.id)) {
                return false;
            }

            return true;
        });

        if (edgesToAdd.length > 0) {
            setEdges((prevEdges) => [...prevEdges, ...edgesToAdd]);

            setEdgeIds((prevIds) => {
                const newIds = new Set(prevIds);
                edgesToAdd.forEach((edge) => newIds.add(edge.id));
                return newIds;
            });
        }
    };

    // Filter nodes and edges based on disabled types
    const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
        return filterGraph(nodes, edges, disabledTypes);
    }, [nodes, edges, disabledTypes]);

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <PanelGroup direction='horizontal' className='h-full'>
                <Panel defaultSize={30} minSize={20} maxSize={50}>
                    <GraphQuery
                        selectedEntries={selectedEntries}
                        setSelectedEntries={setSelectedEntries}
                        config={config}
                        setConfig={setConfig}
                        SearchComponent={GraphSearchComponent}
                        entryGraphColors={entryGraphColors}
                        disabledTypes={disabledTypes}
                        setDisabledTypes={setDisabledTypes}
                        addNodes={addNodes}
                        addEdges={addEdges}
                        nodes={nodes}
                        edges={edges}
                    />
                </Panel>
                <PanelResizeHandle className='w-[2px] cradle-bg-elevated cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                <Panel defaultSize={70} minSize={50}>
                    <div className='relative h-full'>
                        <Graph
                            setSelectedEntries={setSelectedEntries}
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
                        />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
