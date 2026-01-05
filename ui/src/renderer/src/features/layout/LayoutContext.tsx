/**
 * Layout Context - Combined state management for layout and tabs
 * 
 * This is the single source of truth for all layout and tab state.
 */

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutState,
    LayoutContextValue,
    PaneId,
    PaneState,
    Tab,
    LayoutNode,
    SplitDirection,
    SplitPosition,
    SplitPaneResult,
    ContainerId,
    isPaneNode,
    WELCOME_PATH,
} from './types';
import {
    createTab,
    createDefaultPaneState,
    generatePaneId,
    getAllPaneIds as getAllPaneIdsFromTree,
    findFirstPaneId,
    removeNode,
    updateSizes,
    splitPaneInTree,
    shouldExcludeFromTabs,
    getTitleForPath,
    getIconForPath,
} from './utils';
import { loadLayout, saveLayout } from './persistence';

// ============================================================================
// Initial State
// ============================================================================

function createInitialState(): LayoutState {
    // Try to load from localStorage
    const saved = loadLayout();
    if (saved) return saved;
    
    // Create default state with single pane
    const paneId = generatePaneId();
    return {
        root: { type: 'pane', id: paneId },
        activePaneId: paneId,
        panes: {
            [paneId]: createDefaultPaneState(),
        },
    };
}

// ============================================================================
// Reducer Actions
// ============================================================================

type Action =
    | { type: 'SET_ACTIVE_PANE'; paneId: PaneId }
    | { type: 'SPLIT_PANE'; paneId: PaneId; direction: SplitDirection; position: SplitPosition; newPaneId: PaneId; newRoot: LayoutNode }
    | { type: 'CLOSE_PANE'; paneId: PaneId }
    | { type: 'UPDATE_SPLIT_SIZES'; containerId: ContainerId; sizes: [number, number] }
    | { type: 'ADD_TAB'; paneId: PaneId; tab: Tab }
    | { type: 'CLOSE_TAB'; paneId: PaneId; tabIndex: number }
    | { type: 'SWITCH_TAB'; paneId: PaneId; tabIndex: number }
    | { type: 'UPDATE_TAB_PATH'; paneId: PaneId; tabIndex: number; path: string; title: string; icon: ReactNode }
    | { type: 'UPDATE_TAB_TITLE'; paneId: PaneId; tabIndex: number; title: string }
    | { type: 'REORDER_TABS'; paneId: PaneId; fromIndex: number; toIndex: number }
    | { type: 'MOVE_TAB'; fromPaneId: PaneId; tabIndex: number; toPaneId: PaneId; insertIndex: number }
    | { type: 'CLOSE_OTHER_TABS'; paneId: PaneId; keepIndex: number }
    | { type: 'CLOSE_TABS_TO_RIGHT'; paneId: PaneId; fromIndex: number }
    | { type: 'ENSURE_PANE_HAS_TAB'; paneId: PaneId };

function reducer(state: LayoutState, action: Action): LayoutState {
    switch (action.type) {
        case 'SET_ACTIVE_PANE': {
            if (state.activePaneId === action.paneId) return state;
            return { ...state, activePaneId: action.paneId };
        }
        
        case 'SPLIT_PANE': {
            const { newPaneId, newRoot } = action;
            return {
                ...state,
                root: newRoot,
                activePaneId: newPaneId,
                panes: {
                    ...state.panes,
                    [newPaneId]: createDefaultPaneState(),
                },
            };
        }
        
        case 'CLOSE_PANE': {
            const { paneId } = action;
            
            // Can't close if it's the only pane
            if (isPaneNode(state.root) && state.root.id === paneId) {
                return state;
            }
            
            const newRoot = removeNode(state.root, paneId);
            if (!newRoot) return state;
            
            // Remove pane state
            const { [paneId]: _, ...remainingPanes } = state.panes;
            
            // Update active pane if needed
            const newActivePaneId = state.activePaneId === paneId
                ? findFirstPaneId(newRoot)
                : state.activePaneId;
            
            return {
                root: newRoot,
                activePaneId: newActivePaneId,
                panes: remainingPanes,
            };
        }
        
        case 'UPDATE_SPLIT_SIZES': {
            return {
                ...state,
                root: updateSizes(state.root, action.containerId, action.sizes),
            };
        }
        
        case 'ADD_TAB': {
            const { paneId, tab } = action;
            const pane = state.panes[paneId];
            if (!pane) return state;
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: {
                        tabs: [...pane.tabs, tab],
                        activeTabIndex: pane.tabs.length,
                    },
                },
            };
        }
        
        case 'CLOSE_TAB': {
            const { paneId, tabIndex } = action;
            const pane = state.panes[paneId];
            if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return state;
            
            const newTabs = pane.tabs.filter((_, i) => i !== tabIndex);
            
            // If no tabs left, add welcome tab (no empty panes)
            if (newTabs.length === 0) {
                return {
                    ...state,
                    panes: {
                        ...state.panes,
                        [paneId]: {
                            tabs: [createTab(WELCOME_PATH)],
                            activeTabIndex: 0,
                        },
                    },
                };
            }
            
            // Adjust active index
            let newActiveIndex = pane.activeTabIndex;
            if (tabIndex === pane.activeTabIndex) {
                newActiveIndex = Math.max(0, tabIndex - 1);
            } else if (tabIndex < pane.activeTabIndex) {
                newActiveIndex = pane.activeTabIndex - 1;
            }
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: {
                        tabs: newTabs,
                        activeTabIndex: newActiveIndex,
                    },
                },
            };
        }
        
        case 'SWITCH_TAB': {
            const { paneId, tabIndex } = action;
            const pane = state.panes[paneId];
            if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return state;
            if (pane.activeTabIndex === tabIndex) return state;
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: {
                        ...pane,
                        activeTabIndex: tabIndex,
                    },
                },
            };
        }
        
        case 'UPDATE_TAB_PATH': {
            const { paneId, tabIndex, path, title, icon } = action;
            const pane = state.panes[paneId];
            if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return state;
            
            const tab = pane.tabs[tabIndex];
            if (tab.path === path) return state;
            
            const newTabs = [...pane.tabs];
            newTabs[tabIndex] = { ...tab, path, title, icon };
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: { ...pane, tabs: newTabs },
                },
            };
        }
        
        case 'UPDATE_TAB_TITLE': {
            const { paneId, tabIndex, title } = action;
            const pane = state.panes[paneId];
            if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return state;
            
            const newTabs = [...pane.tabs];
            newTabs[tabIndex] = { ...newTabs[tabIndex], title };
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: { ...pane, tabs: newTabs },
                },
            };
        }
        
        case 'REORDER_TABS': {
            const { paneId, fromIndex, toIndex } = action;
            if (fromIndex === toIndex) return state;
            
            const pane = state.panes[paneId];
            if (!pane) return state;
            
            const newTabs = [...pane.tabs];
            const [moved] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, moved);
            
            // Adjust active index
            let newActiveIndex = pane.activeTabIndex;
            if (fromIndex === pane.activeTabIndex) {
                newActiveIndex = toIndex;
            } else if (fromIndex < pane.activeTabIndex && toIndex >= pane.activeTabIndex) {
                newActiveIndex--;
            } else if (fromIndex > pane.activeTabIndex && toIndex <= pane.activeTabIndex) {
                newActiveIndex++;
            }
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: { tabs: newTabs, activeTabIndex: newActiveIndex },
                },
            };
        }
        
        case 'MOVE_TAB': {
            const { fromPaneId, tabIndex, toPaneId, insertIndex } = action;
            const fromPane = state.panes[fromPaneId];
            const toPane = state.panes[toPaneId];
            if (!fromPane || !toPane) return state;
            if (tabIndex < 0 || tabIndex >= fromPane.tabs.length) return state;
            
            const tabToMove = fromPane.tabs[tabIndex];
            const newFromTabs = fromPane.tabs.filter((_, i) => i !== tabIndex);
            
            // Calculate insert position
            const actualInsertIndex = insertIndex >= 0 ? insertIndex : toPane.tabs.length;
            const newToTabs = [...toPane.tabs];
            newToTabs.splice(actualInsertIndex, 0, tabToMove);
            
            // If source pane is empty, add welcome tab
            const finalFromTabs = newFromTabs.length === 0 
                ? [createTab(WELCOME_PATH)] 
                : newFromTabs;
            
            // Adjust source active index
            let newFromActiveIndex = fromPane.activeTabIndex;
            if (tabIndex === fromPane.activeTabIndex) {
                newFromActiveIndex = Math.max(0, tabIndex - 1);
            } else if (tabIndex < fromPane.activeTabIndex) {
                newFromActiveIndex--;
            }
            if (newFromTabs.length === 0) {
                newFromActiveIndex = 0;
            }
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [fromPaneId]: { tabs: finalFromTabs, activeTabIndex: newFromActiveIndex },
                    [toPaneId]: { tabs: newToTabs, activeTabIndex: actualInsertIndex },
                },
            };
        }
        
        case 'CLOSE_OTHER_TABS': {
            const { paneId, keepIndex } = action;
            const pane = state.panes[paneId];
            if (!pane || keepIndex < 0 || keepIndex >= pane.tabs.length) return state;
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: {
                        tabs: [pane.tabs[keepIndex]],
                        activeTabIndex: 0,
                    },
                },
            };
        }
        
        case 'CLOSE_TABS_TO_RIGHT': {
            const { paneId, fromIndex } = action;
            const pane = state.panes[paneId];
            if (!pane || fromIndex < 0 || fromIndex >= pane.tabs.length) return state;
            
            const newTabs = pane.tabs.slice(0, fromIndex + 1);
            const newActiveIndex = Math.min(pane.activeTabIndex, newTabs.length - 1);
            
            return {
                ...state,
                panes: {
                    ...state.panes,
                    [paneId]: { tabs: newTabs, activeTabIndex: newActiveIndex },
                },
            };
        }
        
        case 'ENSURE_PANE_HAS_TAB': {
            const { paneId } = action;
            const pane = state.panes[paneId];
            
            if (!pane) {
                // Pane doesn't exist - create it
                return {
                    ...state,
                    panes: {
                        ...state.panes,
                        [paneId]: createDefaultPaneState(),
                    },
                };
            }
            
            if (pane.tabs.length === 0) {
                // Pane has no tabs - add welcome tab
                return {
                    ...state,
                    panes: {
                        ...state.panes,
                        [paneId]: {
                            tabs: [createTab(WELCOME_PATH)],
                            activeTabIndex: 0,
                        },
                    },
                };
            }
            
            return state;
        }
        
        default:
            return state;
    }
}

// ============================================================================
// Context
// ============================================================================

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
    const ctx = useContext(LayoutContext);
    if (!ctx) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return ctx;
}

// ============================================================================
// Provider
// ============================================================================

interface LayoutProviderProps {
    children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
    const [state, dispatch] = useReducer(reducer, null, createInitialState);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Ref to track programmatic navigation
    const isNavigatingRef = useRef(false);
    const prevActivePaneRef = useRef(state.activePaneId);
    
    // Save layout on state changes (debounced)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveLayout(state);
        }, 500);
        
        return () => clearTimeout(saveTimeoutRef.current);
    }, [state]);
    
    // Sync URL with active tab when location changes externally
    useEffect(() => {
        const path = location.pathname;
        if (!path || shouldExcludeFromTabs(path)) return;
        
        // Skip if pane just changed
        const paneChanged = prevActivePaneRef.current !== state.activePaneId;
        prevActivePaneRef.current = state.activePaneId;
        if (paneChanged) return;
        
        // Skip if we triggered this navigation
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
            return;
        }
        
        // Update active tab's path
        const pane = state.panes[state.activePaneId];
        if (pane && pane.tabs.length > 0) {
            const activeTab = pane.tabs[pane.activeTabIndex];
            if (activeTab && activeTab.path !== path) {
                dispatch({
                    type: 'UPDATE_TAB_PATH',
                    paneId: state.activePaneId,
                    tabIndex: pane.activeTabIndex,
                    path,
                    title: getTitleForPath(path),
                    icon: getIconForPath(path),
                });
            }
        }
    }, [location.pathname, state.activePaneId, state.panes]);
    
    // Helper to navigate
    const safeNavigate = useCallback((path: string) => {
        isNavigatingRef.current = true;
        navigate(path);
    }, [navigate]);
    
    // ========================================================================
    // Layout Operations
    // ========================================================================
    
    const splitPane = useCallback((
        paneId: PaneId,
        direction: SplitDirection,
        position: SplitPosition = 'after'
    ): SplitPaneResult | null => {
        const result = splitPaneInTree(state.root, paneId, direction, position);
        if (!result) return null;
        
        dispatch({
            type: 'SPLIT_PANE',
            paneId,
            direction,
            position,
            newPaneId: result.newPaneId,
            newRoot: result.newRoot,
        });
        
        return { originalPaneId: paneId, newPaneId: result.newPaneId };
    }, [state.root]);
    
    const closePane = useCallback((paneId: PaneId) => {
        dispatch({ type: 'CLOSE_PANE', paneId });
    }, []);
    
    const setActivePaneId = useCallback((paneId: PaneId) => {
        dispatch({ type: 'SET_ACTIVE_PANE', paneId });
        
        // Navigate to the active tab of the new pane
        const pane = state.panes[paneId];
        if (pane && pane.tabs.length > 0) {
            const activeTab = pane.tabs[pane.activeTabIndex];
            if (activeTab) {
                safeNavigate(activeTab.path);
            }
        }
    }, [state.panes, safeNavigate]);
    
    const updateSplitSizes = useCallback((containerId: ContainerId, sizes: [number, number]) => {
        dispatch({ type: 'UPDATE_SPLIT_SIZES', containerId, sizes });
    }, []);
    
    // ========================================================================
    // Tab Operations
    // ========================================================================
    
    const openTab = useCallback((paneId: PaneId, path: string) => {
        const tab = createTab(path);
        dispatch({ type: 'ADD_TAB', paneId, tab });
        
        if (paneId === state.activePaneId) {
            safeNavigate(path);
        }
    }, [state.activePaneId, safeNavigate]);
    
    const closeTab = useCallback((paneId: PaneId, tabIndex: number) => {
        const pane = state.panes[paneId];
        if (!pane) return;
        
        // Calculate what the new active tab will be after closing
        const newTabs = pane.tabs.filter((_, i) => i !== tabIndex);
        let newPath: string;
        
        if (newTabs.length === 0) {
            newPath = WELCOME_PATH;
        } else {
            const newActiveIndex = tabIndex === pane.activeTabIndex
                ? Math.max(0, tabIndex - 1)
                : tabIndex < pane.activeTabIndex
                    ? pane.activeTabIndex - 1
                    : pane.activeTabIndex;
            newPath = newTabs[newActiveIndex]?.path || WELCOME_PATH;
        }
        
        dispatch({ type: 'CLOSE_TAB', paneId, tabIndex });
        
        if (paneId === state.activePaneId) {
            safeNavigate(newPath);
        }
    }, [state.panes, state.activePaneId, safeNavigate]);
    
    const switchTab = useCallback((paneId: PaneId, tabIndex: number) => {
        const pane = state.panes[paneId];
        if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return;
        
        dispatch({ type: 'SWITCH_TAB', paneId, tabIndex });
        
        if (paneId === state.activePaneId) {
            safeNavigate(pane.tabs[tabIndex].path);
        }
    }, [state.panes, state.activePaneId, safeNavigate]);
    
    const updateTabPath = useCallback((paneId: PaneId, tabIndex: number, path: string) => {
        dispatch({
            type: 'UPDATE_TAB_PATH',
            paneId,
            tabIndex,
            path,
            title: getTitleForPath(path),
            icon: getIconForPath(path),
        });
    }, []);
    
    const updateTabTitle = useCallback((paneId: PaneId, tabIndex: number, title: string) => {
        dispatch({ type: 'UPDATE_TAB_TITLE', paneId, tabIndex, title });
    }, []);
    
    const reorderTabs = useCallback((paneId: PaneId, fromIndex: number, toIndex: number) => {
        dispatch({ type: 'REORDER_TABS', paneId, fromIndex, toIndex });
    }, []);
    
    const moveTabToPane = useCallback((
        fromPaneId: PaneId,
        tabIndex: number,
        toPaneId: PaneId,
        insertIndex: number = -1
    ) => {
        dispatch({ type: 'MOVE_TAB', fromPaneId, tabIndex, toPaneId, insertIndex });
        
        // Navigate to the moved tab if target is active pane
        if (toPaneId === state.activePaneId) {
            const fromPane = state.panes[fromPaneId];
            if (fromPane && fromPane.tabs[tabIndex]) {
                safeNavigate(fromPane.tabs[tabIndex].path);
            }
        }
    }, [state.panes, state.activePaneId, safeNavigate]);
    
    const closeOtherTabs = useCallback((paneId: PaneId, keepIndex: number) => {
        const pane = state.panes[paneId];
        if (!pane || !pane.tabs[keepIndex]) return;
        
        dispatch({ type: 'CLOSE_OTHER_TABS', paneId, keepIndex });
        
        if (paneId === state.activePaneId) {
            safeNavigate(pane.tabs[keepIndex].path);
        }
    }, [state.panes, state.activePaneId, safeNavigate]);
    
    const closeTabsToRight = useCallback((paneId: PaneId, fromIndex: number) => {
        const pane = state.panes[paneId];
        if (!pane) return;
        
        dispatch({ type: 'CLOSE_TABS_TO_RIGHT', paneId, fromIndex });
        
        // If active tab was to the right, navigate to the kept tab
        if (paneId === state.activePaneId && pane.activeTabIndex > fromIndex) {
            safeNavigate(pane.tabs[fromIndex].path);
        }
    }, [state.panes, state.activePaneId, safeNavigate]);
    
    // ========================================================================
    // Navigation
    // ========================================================================
    
    const navigateTo = useCallback((path: string) => {
        safeNavigate(path);
    }, [safeNavigate]);
    
    // ========================================================================
    // Utilities
    // ========================================================================
    
    const getPaneState = useCallback((paneId: PaneId): PaneState => {
        return state.panes[paneId] || { tabs: [], activeTabIndex: 0 };
    }, [state.panes]);
    
    const getActiveTab = useCallback((paneId: PaneId): Tab | null => {
        const pane = state.panes[paneId];
        if (!pane || pane.tabs.length === 0) return null;
        return pane.tabs[pane.activeTabIndex] || null;
    }, [state.panes]);
    
    const getAllPaneIds = useCallback((): PaneId[] => {
        return getAllPaneIdsFromTree(state.root);
    }, [state.root]);
    
    // ========================================================================
    // Context Value
    // ========================================================================
    
    const value = useMemo<LayoutContextValue>(() => ({
        state,
        splitPane,
        closePane,
        setActivePaneId,
        updateSplitSizes,
        openTab,
        closeTab,
        switchTab,
        updateTabPath,
        updateTabTitle,
        reorderTabs,
        moveTabToPane,
        closeOtherTabs,
        closeTabsToRight,
        navigate: navigateTo,
        getPaneState,
        getActiveTab,
        getAllPaneIds,
    }), [
        state,
        splitPane,
        closePane,
        setActivePaneId,
        updateSplitSizes,
        openTab,
        closeTab,
        switchTab,
        updateTabPath,
        updateTabTitle,
        reorderTabs,
        moveTabToPane,
        closeOtherTabs,
        closeTabsToRight,
        navigateTo,
        getPaneState,
        getActiveTab,
        getAllPaneIds,
    ]);
    
    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
}

