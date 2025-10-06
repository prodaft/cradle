/**
 * Filters nodes based on disabled types
 * @param {Array} nodes - All nodes in the graph
 * @param {Set} disabledTypes - Set of disabled node types
 * @returns {Array} Filtered nodes
 */
export function filterNodes(nodes, disabledTypes) {
    if (!disabledTypes || disabledTypes.size === 0) {
        return nodes;
    }

    return nodes.filter(node => {
        if (!node.type) return true;
        return !disabledTypes.has(node.type);
    });
}

/**
 * Filters edges based on disabled types and available nodes
 * @param {Array} edges - All edges in the graph
 * @param {Array} filteredNodes - Filtered nodes array
 * @returns {Array} Filtered edges
 */
export function filterEdges(edges, filteredNodes) {
    if (!filteredNodes || filteredNodes.length === 0) {
        return [];
    }

    // Create a set of visible node IDs for quick lookup
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));

    // Only keep edges where both source and target nodes are visible
    return edges.filter(edge => {
        return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
    });
}

/**
 * Filters both nodes and edges based on disabled types
 * @param {Array} nodes - All nodes in the graph
 * @param {Array} edges - All edges in the graph
 * @param {Set} disabledTypes - Set of disabled node types
 * @returns {Object} Object containing filtered nodes and edges
 */
export function filterGraph(nodes, edges, disabledTypes) {
    const filteredNodes = filterNodes(nodes, disabledTypes);
    const filteredEdges = filterEdges(edges, filteredNodes);

    return {
        nodes: filteredNodes,
        edges: filteredEdges
    };
}
