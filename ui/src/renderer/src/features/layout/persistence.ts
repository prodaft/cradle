/**
 * Layout Persistence - Save/Load layout to localStorage
 */

import {
    LayoutState,
    LayoutNode,
    PaneState,
    SerializedLayout,
    SerializedPaneState,
    Tab,
    isPaneNode,
    isSplitNode,
    LAYOUT_STORAGE_KEY,
    WELCOME_PATH,
    PaneId,
} from './types';
import { createTab, getIconForPath } from './utils';

const CURRENT_VERSION = 1;

/**
 * Serialize layout state for storage (removes non-serializable data like ReactNode icons)
 */
export function serializeLayout(state: LayoutState): SerializedLayout {
    const serializedPanes: Record<PaneId, SerializedPaneState> = {};
    
    for (const [paneId, paneState] of Object.entries(state.panes)) {
        serializedPanes[paneId] = {
            tabs: paneState.tabs.map(tab => ({
                path: tab.path,
                title: tab.title,
            })),
            activeTabIndex: paneState.activeTabIndex,
        };
    }
    
    return {
        version: CURRENT_VERSION,
        root: state.root,
        activePaneId: state.activePaneId,
        panes: serializedPanes,
    };
}

/**
 * Deserialize layout from storage (recreates icons and validates data)
 */
export function deserializeLayout(data: SerializedLayout): LayoutState | null {
    try {
        // Version check
        if (data.version !== CURRENT_VERSION) {
            console.warn('Layout version mismatch, resetting to default');
            return null;
        }
        
        // Validate root structure
        if (!data.root || !isValidLayoutNode(data.root)) {
            console.warn('Invalid layout root, resetting to default');
            return null;
        }
        
        // Rebuild pane states with icons
        const panes: Record<PaneId, PaneState> = {};
        const validPaneIds = collectPaneIds(data.root);
        
        for (const paneId of validPaneIds) {
            const serializedPane = data.panes[paneId];
            
            if (!serializedPane || serializedPane.tabs.length === 0) {
                // Pane missing or empty - create with welcome tab
                panes[paneId] = {
                    tabs: [createTab(WELCOME_PATH)],
                    activeTabIndex: 0,
                };
            } else {
                // Rebuild tabs with icons
                const tabs: Tab[] = serializedPane.tabs.map(st => ({
                    id: generateTabId(),
                    path: st.path,
                    title: st.title,
                    icon: getIconForPath(st.path),
                }));
                
                panes[paneId] = {
                    tabs,
                    activeTabIndex: Math.min(
                        serializedPane.activeTabIndex,
                        tabs.length - 1
                    ),
                };
            }
        }
        
        // Validate active pane exists
        const activePaneId = validPaneIds.includes(data.activePaneId)
            ? data.activePaneId
            : validPaneIds[0];
        
        return {
            root: data.root,
            activePaneId,
            panes,
        };
    } catch (error) {
        console.error('Failed to deserialize layout:', error);
        return null;
    }
}

/**
 * Save layout to localStorage
 */
export function saveLayout(state: LayoutState): void {
    try {
        const serialized = serializeLayout(state);
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
        console.error('Failed to save layout:', error);
    }
}

/**
 * Load layout from localStorage
 */
export function loadLayout(): LayoutState | null {
    try {
        const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored) as SerializedLayout;
        return deserializeLayout(parsed);
    } catch (error) {
        console.error('Failed to load layout:', error);
        return null;
    }
}

/**
 * Clear saved layout
 */
export function clearLayout(): void {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
}

// ============================================================================
// Validation Helpers
// ============================================================================

function isValidLayoutNode(node: unknown): node is LayoutNode {
    if (!node || typeof node !== 'object') return false;
    
    const n = node as LayoutNode;
    
    if (n.type === 'pane') {
        return typeof n.id === 'string' && n.id.length > 0;
    }
    
    if (n.type === 'split') {
        const split = n as import('./types').SplitNode;
        return (
            typeof split.id === 'string' &&
            (split.orientation === 'horizontal' || split.orientation === 'vertical') &&
            Array.isArray(split.children) &&
            split.children.length === 2 &&
            isValidLayoutNode(split.children[0]) &&
            isValidLayoutNode(split.children[1]) &&
            Array.isArray(split.sizes) &&
            split.sizes.length === 2
        );
    }
    
    return false;
}

function collectPaneIds(node: LayoutNode): PaneId[] {
    if (isPaneNode(node)) {
        return [node.id];
    }
    if (isSplitNode(node)) {
        return [
            ...collectPaneIds(node.children[0]),
            ...collectPaneIds(node.children[1]),
        ];
    }
    return [];
}

function generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

