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
    ContainerId,
    DropZone,
    LayoutContextValue,
    LayoutNode,
    LayoutState,
    PaneId,
    PaneNode,
    PaneState,
    SplitDirection,
    SplitNode,
    SplitPaneResult,
    SplitPosition,
    Tab,
    TabDragData,
    TabId,
} from './types';

export {
    LAYOUT_STORAGE_KEY,
    TAB_DRAG_TYPE,
    WELCOME_PATH,
    isPaneNode,
    isSplitNode,
} from './types';

// Context & Hooks
export { useTabContext } from './components/TabContent';
export { LayoutProvider, useLayout } from './LayoutContext';
export { TabPortalHostProvider, useTabPortalHost } from './TabPortalHost';

// Components
export { LayoutManager, LayoutRenderer } from './components/LayoutRenderer';
export { Pane } from './components/Pane';
export { TabBar } from './components/TabBar';
export { TabContent, TabContentMount } from './components/TabContent';

// Utilities
export {
    createDefaultPaneState,
    createTab,
    findFirstPaneId,
    generatePaneId,
    generateTabId,
    getAllPaneIds,
    getIconForPath,
    getTitleForPath,
    shouldExcludeFromTabs,
} from './utils';

// Persistence
export { clearLayout, loadLayout, saveLayout } from './persistence';
