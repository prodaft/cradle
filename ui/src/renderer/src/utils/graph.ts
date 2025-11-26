/**
 * Graph data preprocessing utilities
 */

import { truncateText } from './dashboard';

/**
 * Graph entry from API
 * This represents the actual structure returned by the graph API endpoint.
 * It differs from the Entry/Entity generated models which don't include the 'type' field.
 */
export interface GraphEntry {
    id: string;
    name: string;
    type: string;
    subtype?: string;
}

/**
 * Graph link structure (adjacency list from API)
 */
export type GraphLinks = Record<string, string[]>;

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

/**
 * Raw graph data from API
 */
export interface RawGraphData {
    entries: GraphEntry[];
    links: GraphLinks;
    colors: Record<string, string>;
}

/**
 * Preprocessed graph data for D3
 */
export interface PreprocessedGraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * Linear interpolation helper
 *
 * @param x1 - First x value
 * @param x2 - Second x value
 * @param y1 - First y value
 * @param y2 - Second y value
 * @param x - X value to interpolate
 * @returns Interpolated y value
 */
function interpolate(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    x: number,
): number {
    if (x1 === x2) return (y1 + y2) / 2;
    return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

/**
 * Flatten grouped graph entries into a single array
 *
 * @param entries - Grouped entries by type
 * @returns Flattened array of entries with subtype
 */
export const flattenGraphEntries = (
    entries: Record<string, GraphEntry[]>,
): GraphEntry[] => {
    const elist: GraphEntry[] = [];
    for (const et of Object.keys(entries)) {
        for (const e of entries[et]) {
            elist.push({ subtype: et, ...e });
        }
    }
    return elist;
};

/**
 * Preprocesses raw graph data into a format suitable for D3 force simulation.
 * The function maps over the entries in the data and creates a new node for each entry with the necessary properties.
 * It also calculates the degree of each node (i.e., the number of links connected to the node).
 * Labels are truncated to 40 characters.
 *
 * @param data - The raw data to be preprocessed
 * @returns The preprocessed data, containing an array of nodes and an array of links
 */
export const preprocessData = (data: RawGraphData): PreprocessedGraphData => {
    // Initialize an empty array for the nodes
    let nodes: GraphNode[] = [];
    // Get the links from the data
    const adjacency_map = data.links;
    const links: GraphLink[] = [];
    const indices: Record<string, number> = {};
    let c = 0;

    // Map over the entries in the data and create a new node for each entry
    nodes = data.entries.map((entry) => {
        indices[entry.id] = c++;
        return {
            id: entry.id,
            label: entry.subtype
                ? truncateText(`${entry.subtype}: ${entry.name}`, 40)
                : truncateText(`${entry.type}: ${entry.name}`, 40),
            color: data.colors[entry.subtype || entry.type],
            name: entry.name,
            type: entry.type,
            subtype: entry.subtype,
            neighbors: new Set<GraphNode>(),
            links: new Set<GraphLink>(),
            degree: 0,
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
        };
    });

    // Initialize an empty object to store the degrees of the nodes
    const nodesDegrees: Record<string, number> = {};

    let maxDegree = -1;
    let minDegree = Infinity;

    // Calculate the degree of each node (i.e., the number of links connected to the node)
    Object.keys(adjacency_map).forEach((src) => {
        adjacency_map[src].forEach((dst) => {
            nodesDegrees[src] = (nodesDegrees[src] || 0) + 1;
            nodesDegrees[dst] = (nodesDegrees[dst] || 0) + 1;
            nodes[indices[src]].neighbors.add(nodes[indices[dst]]);
            nodes[indices[dst]].neighbors.add(nodes[indices[src]]);
            const link: GraphLink = { source: src, target: dst };
            nodes[indices[src]].links.add(link);
            nodes[indices[dst]].links.add(link);
            links.push(link);
            maxDegree = Math.max(maxDegree, nodesDegrees[src], nodesDegrees[dst]);
            minDegree = Math.min(minDegree, nodesDegrees[src], nodesDegrees[dst]);
        });
    });

    // Assign the calculated degree to each node
    nodes.forEach((node) => {
        node.degree = nodesDegrees[node.id] || 0;
        node.degree_norm = interpolate(minDegree, maxDegree, 1, 2, node.degree);
    });

    // Return the preprocessed data
    return { nodes, links };
};
