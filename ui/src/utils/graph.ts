/**
 * Graph data preprocessing utilities
 */

/**
 * Graph node for D3 force simulation.
 * Extends entry data with D3-specific properties for force-directed layout.
 *
 * NOTE: This is the canonical GraphNode type for graph visualizations.
 * It includes D3.js force simulation properties (x, y, vx, vy, fx, fy)
 * and graph-specific properties (neighbors, links as Sets).
 */
export interface GraphNode {
    id: string;
    label: string;
    color: string;
    name: string;
    type: string;
    subtype?: string;
    /** Set of neighboring nodes (for O(1) lookup) */
    neighbors: Set<GraphNode>;
    /** Set of connected links (for O(1) lookup) */
    links: Set<GraphLink>;
    /** Number of connections to this node */
    degree: number;
    /** Normalized degree for visualization scaling */
    degree_norm?: number;
    // D3 force simulation properties
    x: number;
    y: number;
    vx: number;
    vy: number;
    fx: number | null;
    fy: number | null;
}

/**
 * Graph link for D3 force simulation
 */
export interface GraphLink {
    source: string;
    target: string;
}
