import { useMemo, useState } from 'react';
import { Edge, Node } from './graphFilterUtils';

interface ExplorerPanelProps {
    selectedNodes: Set<Node>;
    allNodes: Node[];
    edges: Edge[];
    onNodeClick?: (node: Node) => void;
}

export default function ExplorerPanel({ selectedNodes, allNodes, edges, onNodeClick }: ExplorerPanelProps) {
    const nodesArray = Array.from(selectedNodes);
    const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

    // Create a map from node id to node for quick lookup
    const nodeMap = useMemo(() => {
        const map = new Map<string, Node>();
        allNodes.forEach((node) => map.set(node.id, node));
        return map;
    }, [allNodes]);

    const toggleConnections = (nodeId: string) => {
        setExpandedConnections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // Get connected nodes for a given node
    const getConnectedNodes = (nodeId: string): Node[] => {
        const connected: Node[] = [];
        edges.forEach((edge) => {
            if (edge.source === nodeId) {
                const targetNode = nodeMap.get(edge.target);
                if (targetNode) connected.push(targetNode);
            } else if (edge.target === nodeId) {
                const sourceNode = nodeMap.get(edge.source);
                if (sourceNode) connected.push(sourceNode);
            }
        });
        return connected;
    };

    if (nodesArray.length === 0) {
        return (
            <div className='px-4 py-3'>
                <div className='text-sm text-gray-500 dark:text-gray-400 text-center py-8'>
                    Click on a node or connection to explore
                </div>
            </div>
        );
    }

    return (
        <div className='px-4 py-3 space-y-4'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
                Selected Nodes ({nodesArray.length})
            </h3>
            <div className='space-y-3 max-h-[60vh] overflow-y-auto'>
                {nodesArray.map((node, index) => (
                    <div
                        key={node.id}
                        className='cradle-bg-primary border border-cradle-border-accent rounded-lg p-3 space-y-2'
                    >
                        {/* Node Label/Name */}
                        <div className='flex items-start justify-between gap-2'>
                            <div className='flex-1 min-w-0'>
                                <div className='text-sm font-semibold text-gray-900 dark:text-gray-100 break-words'>
                                    {node.label || node.name || node.id}
                                </div>
                                {(node.label || node.name) && node.id !== (node.label || node.name) && (
                                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all'>
                                        ID: {node.id}
                                    </div>
                                )}
                            </div>
                            {/* Color indicator */}
                            {node.color && (
                                <div
                                    className='w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0'
                                    style={{ backgroundColor: node.color }}
                                    title={`Color: ${node.color}`}
                                />
                            )}
                        </div>

                        {/* Node Type */}
                        {node.type && (
                            <div className='flex items-center gap-2'>
                                <span className='text-xs text-gray-500 dark:text-gray-400'>Type:</span>
                                <span className='text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded'>
                                    {node.type}
                                </span>
                            </div>
                        )}

                        {/* Node Subtype */}
                        {node.subtype && (
                            <div className='flex items-center gap-2'>
                                <span className='text-xs text-gray-500 dark:text-gray-400'>Subtype:</span>
                                <span className='text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded'>
                                    {node.subtype}
                                </span>
                            </div>
                        )}

                        {/* Connected Nodes */}
                        {(() => {
                            const connectedNodes = getConnectedNodes(node.id);
                            if (connectedNodes.length === 0) return null;
                            const isExpanded = expandedConnections.has(node.id);
                            const showCollapse = connectedNodes.length > 5;
                            const displayedNodes = showCollapse && !isExpanded 
                                ? connectedNodes.slice(0, 5) 
                                : connectedNodes;
                            
                            return (
                                <div className='space-y-2'>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                                            Connections ({connectedNodes.length}):
                                        </span>
                                        {showCollapse && (
                                            <button
                                                type='button'
                                                onClick={() => toggleConnections(node.id)}
                                                className='text-xs text-cradle-accent-primary hover:underline'
                                            >
                                                {isExpanded ? 'Show less' : `Show all (${connectedNodes.length})`}
                                            </button>
                                        )}
                                    </div>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {displayedNodes.map((connectedNode) => (
                                            <button
                                                key={connectedNode.id}
                                                type='button'
                                                onClick={() => onNodeClick?.(connectedNode)}
                                                className='inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors cursor-pointer'
                                                title={`Click to select ${connectedNode.label || connectedNode.name || connectedNode.id}`}
                                            >
                                                {connectedNode.color && (
                                                    <span
                                                        className='w-2 h-2 rounded-full flex-shrink-0'
                                                        style={{ backgroundColor: connectedNode.color }}
                                                    />
                                                )}
                                                <span className='truncate max-w-[120px]'>
                                                    {connectedNode.label || connectedNode.name || connectedNode.id}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Additional properties */}
                        {Object.entries(node)
                            .filter(
                                ([key]) =>
                                    !['id', 'label', 'name', 'color', 'degree', 'type', 'subtype', 'location'].includes(key) &&
                                    !key.startsWith('_')
                            )
                            .map(([key, value]) => (
                                <div key={key} className='flex items-start gap-2'>
                                    <span className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
                                        {key}:
                                    </span>
                                    <span className='text-xs text-gray-700 dark:text-gray-300 break-words flex-1'>
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </span>
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

