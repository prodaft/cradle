import type { components } from '@services/openapi/schema';

export type EdgeRelation = components['schemas']['EdgeRelation'];

export interface Node {
    id: string;
    label?: string;
    color?: string;
    degree?: number;
    type?: string;
    [key: string]: any;
}

export interface Edge {
    source: string;
    target: string;
}

/**
 * Filters nodes based on disabled types
 * @param nodes - All nodes in the graph
 * @param disabledTypes - Set of disabled node types
 * @returns Filtered nodes
 */
export function filterNodes<T extends Node>(
    nodes: T[],
    disabledTypes: Set<string>,
): T[] {
    if (!disabledTypes || disabledTypes.size === 0) {
        return nodes;
    }

    return nodes.filter((node) => {
        if (!node.subtype) return true;
        return !disabledTypes.has(node.subtype);
    });
}

/**
 * Filters edges based on disabled types and available nodes
 * @param edges - All edges in the graph
 * @param filteredNodes - Filtered nodes array
 * @returns Filtered edges
 */
export function filterEdges<T extends Node, E extends EdgeRelation>(
    edges: E[],
    filteredNodes: T[],
): E[] {
    if (!filteredNodes || filteredNodes.length === 0) {
        return [];
    }

    // Create a set of visible node IDs for quick lookup
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));

    // Only keep edges where both source and target nodes are visible
    return edges.filter((edge) => {
        return (
            visibleNodeIds.has(String(edge.src)) && visibleNodeIds.has(String(edge.dst))
        );
    });
}

/**
 * Filters both nodes and edges based on disabled types
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param disabledTypes - Set of disabled node types
 * @returns Object containing filtered nodes and edges
 */
export function filterGraph<T extends Node, E extends EdgeRelation>(
    nodes: T[],
    edges: E[],
    disabledTypes: Set<string>,
): { nodes: T[]; edges: E[] } {
    const filteredNodes = filterNodes(nodes, disabledTypes);
    const filteredEdges = filterEdges(edges, filteredNodes);

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
    };
}
