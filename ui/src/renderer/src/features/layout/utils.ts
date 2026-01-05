/**
 * Layout & Tabs System - Utility Functions
 */

import { ReactNode } from 'react';
import {
    Tab,
    PaneState,
    LayoutNode,
    PaneNode,
    SplitNode,
    PaneId,
    isPaneNode,
    isSplitNode,
    WELCOME_PATH,
} from './types';

// ============================================================================
// ID Generation
// ============================================================================

export function generatePaneId(): PaneId {
    return `pane-${crypto.randomUUID()}`;
}

export function generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function generateContainerId(): string {
    return `container-${crypto.randomUUID()}`;
}

// ============================================================================
// Tab Creation
// ============================================================================

/**
 * Create a new tab for a given path
 */
export function createTab(path: string): Tab {
    return {
        id: generateTabId(),
        path,
        title: getTitleForPath(path),
        icon: getIconForPath(path),
    };
}

/**
 * Create default pane state with a welcome tab
 */
export function createDefaultPaneState(): PaneState {
    return {
        tabs: [createTab(WELCOME_PATH)],
        activeTabIndex: 0,
    };
}

// ============================================================================
// Path to Title/Icon Mapping
// ============================================================================

const PATH_TITLES: Record<string, string> = {
    '/': 'Welcome',
    '/documents': 'Documents',
    '/files': 'Files',
    '/digest-data': 'Digest Data',
    '/notes': 'Notes',
    '/editor': 'Fleeting Note',
    '/dashboards': 'Dashboard',
    '/knowledge-graph': 'Knowledge Graph',
    '/reports': 'Reports',
    '/publish': 'Publish',
    '/activity': 'Activity',
    '/settings': 'Settings',
    '/manage': 'Manage',
};

export function getTitleForPath(path: string): string {
    if (!path || path === '/') return 'Welcome';
    
    // Check exact match first
    if (PATH_TITLES[path]) return PATH_TITLES[path];
    
    // Check first segment
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Welcome';
    
    const firstSegment = segments[0];
    const baseTitle = PATH_TITLES[`/${firstSegment}`];
    
    if (baseTitle) {
        // If there's an ID segment, show abbreviated version
        if (segments.length > 1 && segments[1] !== 'edit') {
            const id = segments[1];
            const shortId = id.length > 8 ? `${id.slice(0, 8)}...` : id;
            return `${baseTitle}: ${shortId}`;
        }
        return baseTitle;
    }
    
    // Fallback: capitalize first segment
    return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).replace(/-/g, ' ');
}

export function getIconForPath(path: string): ReactNode {
    // Return icon name as string - will be rendered by TabItem
    if (!path || path === '/') return 'Home';
    
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';
    
    const iconMap: Record<string, string> = {
        documents: 'PageFlip',
        files: 'Folder',
        'digest-data': 'DatabaseBackup',
        notes: 'Notes',
        editor: 'EditPencil',
        dashboards: 'Dashboard',
        'knowledge-graph': 'NetworkAlt',
        reports: 'Page',
        publish: 'CloudUpload',
        activity: 'Activity',
        settings: 'Settings',
        manage: 'Shield',
    };
    
    return iconMap[segments[0]] || 'Page';
}

// ============================================================================
// Excluded Paths (don't create tabs for these)
// ============================================================================

const EXCLUDED_PATHS = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/confirm-email',
];

export function shouldExcludeFromTabs(path: string): boolean {
    return EXCLUDED_PATHS.includes(path);
}

// ============================================================================
// Layout Tree Utilities
// ============================================================================

/**
 * Find a node in the tree by ID
 */
export function findNode(root: LayoutNode, id: string): LayoutNode | null {
    if (root.id === id) return root;
    
    if (isSplitNode(root)) {
        return findNode(root.children[0], id) || findNode(root.children[1], id);
    }
    
    return null;
}

/**
 * Get all pane IDs from the tree
 */
export function getAllPaneIds(root: LayoutNode): PaneId[] {
    if (isPaneNode(root)) {
        return [root.id];
    }
    
    if (isSplitNode(root)) {
        return [
            ...getAllPaneIds(root.children[0]),
            ...getAllPaneIds(root.children[1]),
        ];
    }
    
    return [];
}

/**
 * Find the first pane ID in the tree
 */
export function findFirstPaneId(root: LayoutNode): PaneId {
    if (isPaneNode(root)) return root.id;
    return findFirstPaneId(root.children[0]);
}

/**
 * Remove a node from the tree, collapsing parents as needed
 */
export function removeNode(root: LayoutNode, targetId: string): LayoutNode | null {
    if (root.id === targetId) return null;
    
    if (!isSplitNode(root)) return root;
    
    const left = removeNode(root.children[0], targetId);
    const right = removeNode(root.children[1], targetId);
    
    // Both children remain
    if (left && right) {
        return { ...root, children: [left, right] };
    }
    
    // One child remains - collapse the split
    if (left) return left;
    if (right) return right;
    
    // No children remain
    return null;
}

/**
 * Update sizes in a split node
 */
export function updateSizes(
    root: LayoutNode,
    containerId: string,
    newSizes: [number, number]
): LayoutNode {
    if (root.id === containerId && isSplitNode(root)) {
        // Normalize sizes to sum to 100
        const total = newSizes[0] + newSizes[1];
        const normalized: [number, number] = [
            (newSizes[0] / total) * 100,
            (newSizes[1] / total) * 100,
        ];
        return { ...root, sizes: normalized };
    }
    
    if (isSplitNode(root)) {
        return {
            ...root,
            children: [
                updateSizes(root.children[0], containerId, newSizes),
                updateSizes(root.children[1], containerId, newSizes),
            ],
        };
    }
    
    return root;
}

/**
 * Split a pane, creating a new sibling pane
 */
export function splitPaneInTree(
    root: LayoutNode,
    paneId: PaneId,
    orientation: 'horizontal' | 'vertical',
    position: 'before' | 'after'
): { newRoot: LayoutNode; newPaneId: PaneId } | null {
    const newPaneId = generatePaneId();
    const newPane: PaneNode = { type: 'pane', id: newPaneId };
    
    const result = splitNodeRecursive(root, paneId, orientation, position, newPane);
    
    if (result) {
        return { newRoot: result, newPaneId };
    }
    
    return null;
}

function splitNodeRecursive(
    node: LayoutNode,
    targetPaneId: PaneId,
    orientation: 'horizontal' | 'vertical',
    position: 'before' | 'after',
    newPane: PaneNode
): LayoutNode | null {
    if (isPaneNode(node) && node.id === targetPaneId) {
        const children: [LayoutNode, LayoutNode] = 
            position === 'before' 
                ? [newPane, node] 
                : [node, newPane];
        
        const newSplit: SplitNode = {
            type: 'split',
            id: generateContainerId(),
            orientation,
            children,
            sizes: [50, 50],
        };
        
        return newSplit;
    }
    
    if (isSplitNode(node)) {
        const left = splitNodeRecursive(node.children[0], targetPaneId, orientation, position, newPane);
        if (left) {
            return { ...node, children: [left, node.children[1]] };
        }
        
        const right = splitNodeRecursive(node.children[1], targetPaneId, orientation, position, newPane);
        if (right) {
            return { ...node, children: [node.children[0], right] };
        }
    }
    
    return null;
}

