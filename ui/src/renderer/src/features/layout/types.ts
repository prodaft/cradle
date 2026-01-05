/**
 * Layout & Tabs System - Type Definitions
 * 
 * This is the single source of truth for all types in the layout system.
 */

import { ReactNode } from 'react';

// ============================================================================
// Core Types
// ============================================================================

export type PaneId = string;
export type TabId = string;
export type ContainerId = string;

/**
 * A single tab within a pane
 */
export interface Tab {
    id: TabId;
    path: string;
    title: string;
    icon: ReactNode;
}

/**
 * State of a single pane (its tabs and which is active)
 */
export interface PaneState {
    tabs: Tab[];
    activeTabIndex: number;
}

/**
 * A leaf node in the layout tree - contains tabs
 */
export interface PaneNode {
    type: 'pane';
    id: PaneId;
}

/**
 * A split node in the layout tree - contains two children
 */
export interface SplitNode {
    type: 'split';
    id: ContainerId;
    orientation: 'horizontal' | 'vertical';
    children: [LayoutNode, LayoutNode];
    sizes: [number, number]; // Percentages that sum to 100
}

/**
 * Any node in the layout tree
 */
export type LayoutNode = PaneNode | SplitNode;

/**
 * Complete layout state
 */
export interface LayoutState {
    root: LayoutNode;
    activePaneId: PaneId;
    panes: Record<PaneId, PaneState>;
}

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Serializable tab (without ReactNode icon)
 */
export interface SerializedTab {
    path: string;
    title: string;
}

/**
 * Serializable pane state
 */
export interface SerializedPaneState {
    tabs: SerializedTab[];
    activeTabIndex: number;
}

/**
 * Serializable layout for localStorage
 */
export interface SerializedLayout {
    version: number;
    root: LayoutNode;
    activePaneId: PaneId;
    panes: Record<PaneId, SerializedPaneState>;
}

// ============================================================================
// Action Types
// ============================================================================

export type SplitDirection = 'horizontal' | 'vertical';
export type SplitPosition = 'before' | 'after';

export interface SplitPaneResult {
    originalPaneId: PaneId;
    newPaneId: PaneId;
}

// ============================================================================
// Drag & Drop Types
// ============================================================================

export interface TabDragData {
    paneId: PaneId;
    tabIndex: number;
    tabCount: number;
}

export type DropZone = 'top' | 'bottom' | 'left' | 'right' | 'tabs' | null;

// ============================================================================
// Context Types
// ============================================================================

export interface LayoutContextValue {
    // State
    state: LayoutState;
    
    // Layout operations
    splitPane: (paneId: PaneId, direction: SplitDirection, position?: SplitPosition) => SplitPaneResult | null;
    closePane: (paneId: PaneId) => void;
    setActivePaneId: (paneId: PaneId) => void;
    updateSplitSizes: (containerId: ContainerId, sizes: [number, number]) => void;
    
    // Tab operations
    openTab: (paneId: PaneId, path: string) => void;
    closeTab: (paneId: PaneId, tabIndex: number) => void;
    switchTab: (paneId: PaneId, tabIndex: number) => void;
    updateTabPath: (paneId: PaneId, tabIndex: number, path: string) => void;
    updateTabTitle: (paneId: PaneId, tabIndex: number, title: string) => void;
    reorderTabs: (paneId: PaneId, fromIndex: number, toIndex: number) => void;
    moveTabToPane: (fromPaneId: PaneId, tabIndex: number, toPaneId: PaneId, insertIndex?: number) => void;
    closeOtherTabs: (paneId: PaneId, keepIndex: number) => void;
    closeTabsToRight: (paneId: PaneId, fromIndex: number) => void;
    
    // Navigation
    navigate: (path: string) => void;
    
    // Utilities
    getPaneState: (paneId: PaneId) => PaneState;
    getActiveTab: (paneId: PaneId) => Tab | null;
    getAllPaneIds: () => PaneId[];
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export const isPaneNode = (node: LayoutNode): node is PaneNode => node.type === 'pane';
export const isSplitNode = (node: LayoutNode): node is SplitNode => node.type === 'split';

// ============================================================================
// Constants
// ============================================================================

export const WELCOME_PATH = '/';
export const LAYOUT_STORAGE_KEY = 'cradle-layout-v1';
export const TAB_DRAG_TYPE = 'application/x-cradle-tab';

