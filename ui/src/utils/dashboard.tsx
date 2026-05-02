/**
 * Dashboard utilities for organizing and rendering dashboard content
 */

import type { components } from '@services/openapi/schema';

type EntryListCompressedTree = components['schemas']['EntryListCompressedTree'];

/**
 * Dashboard entry structure
 * Matches OptimizedEntryResponse fields used for navigation
 */
interface DashboardEntry {
    name: string;
    subtype?: string; // Optional to match API response
    type?: string;
}

/**
 * Subtype hierarchy tree node
 */
interface TreeNode {
    [key: string]: TreeNode;
}

/**
 * Class for building and converting subtype hierarchies
 */
export class SubtypeHierarchy {
    private tree: TreeNode;
    private pathsMap: Record<string, boolean>;

    constructor(paths: string[]) {
        this.tree = {};
        this.pathsMap = {};

        for (const path of paths) {
            // Store the original full path
            this.pathsMap[path] = true;

            path.split('/').reduce((acc, cur) => {
                const next = acc[cur] ?? (acc[cur] = {});
                return next;
            }, this.tree);
        }
    }

    /**
     * Convert the hierarchy tree using custom callbacks
     *
     * @param node_callback - Callback for internal nodes
     * @param leaf_callback - Callback for leaf nodes
     * @returns Converted tree structure
     */
    convert<T>(
        node_callback: (value: string, children: T[], childPaths: string[]) => T,
        leaf_callback: (value: string, path: string) => T,
    ): T[] {
        const traverse = (value: string, children: TreeNode, path: string): T => {
            if (Object.keys(children).length === 0) {
                // Leaf node
                return leaf_callback(value, path);
            }

            // Internal node
            const childResults: T[] = [];

            // Collect all child paths for this node
            const childPaths = this.collectChildPaths(path + value + '/', children);

            // Sort children by depth before traversing
            const sortedKeys = Object.keys(children).sort((a, b) => {
                const ca = children[a];
                const cb = children[b];
                if (!ca || !cb) return 0;
                return this.getDepth(ca) - this.getDepth(cb);
            });

            for (const key of sortedKeys) {
                const child = children[key];
                if (!child) continue;
                childResults.push(traverse(key, child, path + value + '/'));
            }

            return node_callback(value, childResults, childPaths);
        };

        const sortedKeys = Object.keys(this.tree).sort((a, b) => {
            const ta = this.tree[a];
            const tb = this.tree[b];
            if (!ta || !tb) return 0;
            return this.getDepth(ta) - this.getDepth(tb);
        });

        return sortedKeys.flatMap((key) => {
            const node = this.tree[key];
            return node !== undefined ? [traverse(key, node, '')] : [];
        });
    }

    /**
     * Collect all child paths for a given node
     */
    private collectChildPaths(currentPath: string, node: TreeNode): string[] {
        const paths: string[] = [];

        const collectPaths = (nodePath: string, subNode: TreeNode): void => {
            // Check if this is a valid path in our original data
            if (this.pathsMap[nodePath.slice(0, -1)]) {
                paths.push(nodePath.slice(0, -1)); // Remove trailing slash
            }

            // Process children
            for (const key of Object.keys(subNode)) {
                const child = subNode[key];
                if (child) {
                    collectPaths(nodePath + key + '/', child);
                }
            }
        };

        collectPaths(currentPath, node);
        return paths;
    }

    /**
     * Calculate depth of a subtree
     */
    private getDepth(node: TreeNode): number {
        if (Object.keys(node).length === 0) {
            return 0; // Leaf node
        }
        return (
            1 + Math.max(...Object.values(node).map((child) => this.getDepth(child)))
        );
    }
}

/**
 * Link tree item structure
 */
interface LinkTreeItem {
    type: string;
    subtype: string;
    name: string;
    [key: string]: any;
}

/**
 * Utility class for flattening 3-level link trees
 */
export class LinkTreeFlattener {
    /**
     * Flattens a 3-level link tree into a list of objects
     *
     * @param tree - The 3-level link tree to flatten
     * @returns A list of flattened objects, each with at least { type, subtype, name }
     */
    static flatten(tree: EntryListCompressedTree): LinkTreeItem[] {
        const result: LinkTreeItem[] = [];
        for (const type of Object.keys(tree)) {
            for (const subtype of Object.keys(tree[type])) {
                const items = tree[type][subtype];
                for (const item of items) {
                    if (typeof item === 'string') {
                        result.push({
                            type,
                            subtype,
                            name: item,
                        });
                    } else {
                        result.push({
                            type,
                            subtype,
                            name: item.name || '',
                            ...item,
                        });
                    }
                }
            }
        }

        return result;
    }
}

/**
 * Create a dashboard link for an entry
 *
 * @param entry - The entry object
 * @returns The dashboard link
 */
export const createDashboardLink = (entry: DashboardEntry | null): string => {
    if (!entry) {
        return '/not-found';
    }

    const { name, subtype } = entry;

    if (!name || !subtype) {
        return '/not-found';
    }

    return `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}`;
};

/**
 * Group entries by subtype with custom transformation
 *
 * @param entries - Array of entries
 * @param entry_transformer - Function to transform each entry
 * @returns Grouped entry cards
 */
const _groupSubtypes = <T,>(
    entries: DashboardEntry[],
    entry_transformer: (entry: DashboardEntry) => T,
): T[][] => {
    const sublistIndices: Record<string, number> = {};
    const entryCards: T[][] = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry === undefined) continue;
        // Skip entries without subtype
        if (!entry.subtype) continue;

        if (sublistIndices[entry.subtype] === undefined) {
            if (entry.type === 'entity') {
                for (const j of Object.keys(sublistIndices)) {
                    const prev = sublistIndices[j];
                    if (prev !== undefined) {
                        sublistIndices[j] = prev + 1;
                    }
                }
                sublistIndices[entry.subtype] = 0;
                entryCards.unshift([]);
            } else {
                sublistIndices[entry.subtype] = entryCards.length;
                entryCards.push([]);
            }
        }

        const idx = sublistIndices[entry.subtype];
        const bucket = idx !== undefined ? entryCards[idx] : undefined;
        if (bucket !== undefined) {
            bucket.push(entry_transformer(entry));
        }
    }

    return entryCards.filter((l) => l.length !== 0);
};

/**
 * Truncate text to a specific length
 *
 * @param text - The text to truncate
 * @param maxLength - The maximum length of the truncated text (not including '...')
 * @param defaultText - Default text if input is empty
 * @returns The truncated text
 */
export const truncateText = (
    text: string | null | undefined,
    maxLength: number,
    defaultText: string = '-',
): string => {
    if (!text) {
        return defaultText;
    }

    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength) + '...';
};

/**
 * Natural sort comparison function for strings with numbers
 *
 * @param a - First string
 * @param b - Second string
 * @returns Comparison result
 */
function _naturalSort(a: string, b: string): number {
    // Regular expression to split strings into parts
    const regex = /([^0-9]+)([0-9]+)/;

    // Helper to split a string into text/number parts
    const getParts = (str: string): (string | number)[] => {
        const parts: (string | number)[] = [];
        let remainder = str;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(remainder)) !== null) {
            const textPart = match[1];
            const numPart = match[2];
            if (textPart === undefined || numPart === undefined) break;
            parts.push(textPart);
            parts.push(parseInt(numPart, 10));
            remainder = remainder.substring(match[0].length);
        }

        // Add any remaining text
        if (remainder) parts.push(remainder);
        return parts;
    };

    const aParts = getParts(a);
    const bParts = getParts(b);

    // Compare each part
    const minLength = Math.min(aParts.length, bParts.length);
    for (let i = 0; i < minLength; i++) {
        const ai = aParts[i];
        const bi = bParts[i];
        if (ai === undefined || bi === undefined) continue;
        // If both parts are numbers, compare numerically
        if (typeof ai === 'number' && typeof bi === 'number') {
            if (ai !== bi) {
                return ai - bi;
            }
        }
        // Otherwise compare as strings
        else if (ai !== bi) {
            return ai.toString().localeCompare(bi.toString());
        }
    }

    // If all comparable parts are equal, the shorter string comes first
    return aParts.length - bParts.length;
}
