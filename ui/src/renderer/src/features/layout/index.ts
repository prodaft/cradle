/**
 * Layout System - Public API
 * 
 * Usage:
 * 
 * 1. Wrap your app with providers:
 *    <LayoutProvider>
 *      <TabPortalHostProvider>
 *        <LayoutManager />
 *      </TabPortalHostProvider>
 *    </LayoutProvider>
 * 
 * 2. Use hooks in components:
 *    const { navigate, switchTab, closeTab } = useLayout();
 *    const { tabId, path, isActive } = useTabContext();
 */

// Types
export type {
    Tab,
    TabId,
    PaneId,
    ContainerId,
    PaneState,
    PaneNode,
    SplitNode,
    LayoutNode,
    LayoutState,
    LayoutContextValue,
    SplitDirection,
    SplitPosition,
    SplitPaneResult,
    TabDragData,
    DropZone,
} from './types';

export {
    isPaneNode,
    isSplitNode,
    WELCOME_PATH,
    LAYOUT_STORAGE_KEY,
    TAB_DRAG_TYPE,
} from './types';

// Context & Hooks
export { LayoutProvider, useLayout } from './LayoutContext';
export { TabPortalHostProvider, useTabPortalHost } from './TabPortalHost';
export { useTabContext } from './components/TabContent';

// Components
export { LayoutManager, LayoutRenderer } from './components/LayoutRenderer';
export { Pane } from './components/Pane';
export { TabBar } from './components/TabBar';
export { TabContent, TabContentMount } from './components/TabContent';

// Utilities
export {
    createTab,
    createDefaultPaneState,
    generatePaneId,
    generateTabId,
    getTitleForPath,
    getIconForPath,
    shouldExcludeFromTabs,
    getAllPaneIds,
    findFirstPaneId,
} from './utils';

// Persistence
export {
    saveLayout,
    loadLayout,
    clearLayout,
} from './persistence';

