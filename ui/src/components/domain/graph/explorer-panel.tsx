import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo, useState } from 'react';
import { Edge, Node } from './graphFilterUtils';

interface ExplorerPanelProps {
    selectedNodes: Set<Node>;
    allNodes: Node[];
    edges: Edge[];
    onNodeClick?: (node: Node) => void;
}

const EXCLUDED_NODE_KEYS = new Set([
    'id',
    'label',
    'name',
    'color',
    'degree',
    'type',
    'subtype',
    'location',
]);

export default function ExplorerPanel({
    selectedNodes,
    allNodes,
    edges,
    onNodeClick,
}: ExplorerPanelProps) {
    const nodesArray = Array.from(selectedNodes);
    const [expandedConnections, setExpandedConnections] = useState<Set<string>>(
        new Set(),
    );

    // Create a map from node id to node for quick lookup
    const nodeMap = useMemo(() => {
        const map = new Map<string, Node>();
        allNodes.forEach((node) => map.set(node.id, node));
        return map;
    }, [allNodes]);

    const getDisplayLabel = (node: Node) => node.label ?? node.name ?? node.id;

    const connectionsMap = useMemo(() => {
        const tmp = new Map<string, Map<string, Node>>();

        const add = (fromId: string, to: Node) => {
            let inner = tmp.get(fromId);
            if (!inner) {
                inner = new Map<string, Node>();
                tmp.set(fromId, inner);
            }
            inner.set(to.id, to);
        };

        for (const edge of edges) {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) continue;
            add(source.id, target);
            add(target.id, source);
        }

        const out = new Map<string, Node[]>();
        for (const [id, inner] of tmp) out.set(id, Array.from(inner.values()));
        return out;
    }, [edges, nodeMap]);

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

    if (nodesArray.length === 0) {
        return (
            <div className='px-4 py-3'>
                <div className='text-sm text-muted-foreground text-center py-8'>
                    Click on a node or connection to explore
                </div>
            </div>
        );
    }

    return (
        <div className='px-4 py-3 space-y-4'>
            <h3 className='text-sm font-semibold text-foreground mb-3'>
                Selected Nodes ({nodesArray.length})
            </h3>
            <ScrollArea className='space-y-3 max-h-[60vh]'>
                {nodesArray.map((node) => (
                    <div
                        key={node.id}
                        className='bg-card border border-border rounded-lg p-3 space-y-2'
                    >
                        {/* Node Label/Name */}
                        <div className='flex items-start justify-between gap-2'>
                            <div className='flex-1 min-w-0'>
                                <div className='text-sm font-semibold text-foreground break-words'>
                                    {getDisplayLabel(node)}
                                </div>
                                {(() => {
                                    const labelOrName = node.label ?? node.name;
                                    if (!labelOrName || node.id === labelOrName)
                                        return null;
                                    return (
                                        <div className='text-xs text-muted-foreground mt-1 font-mono break-all'>
                                            ID: {node.id}
                                        </div>
                                    );
                                })()}
                            </div>
                            {/* Color indicator */}
                            {node.color && (
                                <div
                                    className='w-4 h-4 rounded-full border border-border flex-shrink-0'
                                    style={{ backgroundColor: node.color }}
                                    title={`Color: ${node.color}`}
                                />
                            )}
                        </div>

                        {/* Node Type */}
                        {node.type && (
                            <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground'>
                                    Type:
                                </span>
                                <span className='text-xs px-2 py-0.5 bg-muted rounded'>
                                    {node.type}
                                </span>
                            </div>
                        )}

                        {/* Node Subtype */}
                        {node.subtype && (
                            <div className='flex items-center gap-2'>
                                <span className='text-xs text-muted-foreground'>
                                    Subtype:
                                </span>
                                <span className='text-xs px-2 py-0.5 bg-muted rounded'>
                                    {node.subtype}
                                </span>
                            </div>
                        )}

                        {/* Connected Nodes */}
                        {(() => {
                            const connectedNodes = connectionsMap.get(node.id) ?? [];
                            if (connectedNodes.length === 0) return null;
                            const isExpanded = expandedConnections.has(node.id);
                            const showCollapse = connectedNodes.length > 5;
                            const displayedNodes =
                                showCollapse && !isExpanded
                                    ? connectedNodes.slice(0, 5)
                                    : connectedNodes;

                            return (
                                <div className='space-y-2'>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-xs text-muted-foreground'>
                                            Connections ({connectedNodes.length}):
                                        </span>
                                        {showCollapse && (
                                            <Button
                                                variant='link'
                                                size='sm'
                                                type='button'
                                                onClick={() =>
                                                    toggleConnections(node.id)
                                                }
                                                className='text-xs h-auto p-0'
                                            >
                                                {isExpanded
                                                    ? 'Show less'
                                                    : `Show all (${connectedNodes.length})`}
                                            </Button>
                                        )}
                                    </div>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {displayedNodes.map((connectedNode) => (
                                            <Button
                                                key={connectedNode.id}
                                                variant='outline'
                                                size='sm'
                                                type='button'
                                                onClick={() =>
                                                    onNodeClick?.(connectedNode)
                                                }
                                                className='inline-flex items-center gap-1.5 px-2 py-1 text-xs h-auto'
                                                title={`Click to select ${getDisplayLabel(connectedNode)}`}
                                            >
                                                {connectedNode.color && (
                                                    <span
                                                        className='w-2 h-2 rounded-full flex-shrink-0'
                                                        style={{
                                                            backgroundColor:
                                                                connectedNode.color,
                                                        }}
                                                    />
                                                )}
                                                <span className='truncate max-w-[120px]'>
                                                    {getDisplayLabel(connectedNode)}
                                                </span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Additional properties */}
                        {Object.entries(node)
                            .filter(
                                ([key]) =>
                                    !EXCLUDED_NODE_KEYS.has(key) &&
                                    !key.startsWith('_'),
                            )
                            .map(([key, value]) => (
                                <div key={key} className='flex items-start gap-2'>
                                    <span className='text-xs text-muted-foreground capitalize'>
                                        {key}:
                                    </span>
                                    <span className='text-xs text-foreground break-words flex-1'>
                                        {typeof value === 'object'
                                            ? JSON.stringify(value, null, 2)
                                            : String(value)}
                                    </span>
                                </div>
                            ))}
                    </div>
                ))}
            </ScrollArea>
        </div>
    );
}
