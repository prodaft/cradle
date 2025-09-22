import { useState } from 'react';
import 'tailwindcss/tailwind.css';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';
import GraphSearch from '../GraphQuery/GraphSearch';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';

export default function GraphExplorer() {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [config, setConfig] = useState({
        nodeRadiusCoefficient: 1,
        linkWidthCoefficient: 1,
        simulationGravity: 0.2,
        simulationRepulsion: 1.5,
        simulationLinkSpring: 0.5,
        simulationLinkDistance: 10,
    });
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
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
        }
    };

    const addEdges = (newEdges) => {
        if (!Array.isArray(newEdges)) {
            newEdges = [newEdges];
        }

        const edgesToAdd = newEdges.filter((edge) => {
            // Check if edge has required properties
            if (!edge.id || !edge.source || !edge.target) {
                console.warn(
                    'Edge missing required properties (id, source, target):',
                    edge,
                );
                return false;
            }

            // Check if edge already exists
            if (edgeIds.has(edge.id)) {
                return false;
            }

            // Check if both source and target nodes exist
            // if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
            //     console.warn('Edge references non-existent nodes:', edge);
            //     return false;
            // }

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

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ResizableSplitPane
                initialSplitPosition={30}
                leftContent={
                    <GraphQuery
                        selectedEntries={selectedEntries}
                        setSelectedEntries={setSelectedEntries}
                        config={config}
                        setConfig={setConfig}
                        SearchComponent={GraphSearch}
                        addNodes={addNodes}
                        addEdges={addEdges}
                        nodes={nodes}
                        edges={edges}
                    />
                }
                rightContent={
                    <div className='relative'>
                        <Graph
                            setSelectedEntries={setSelectedEntries}
                            onClearGraph={() => {
                                setNodes([]);
                                setEdges([]);
                                setNodeIds(new Set());
                                setEdgeIds(new Set());
                            }}
                            config={config}
                            nodes={nodes}
                            edges={edges}
                        />
                    </div>
                }
            />
        </div>
    );
}
