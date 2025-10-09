import { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from '../LayoutContext/LayoutContext';
import { shouldExcludeFromTabs, getTitleForPath, getIconForPath, createTab, createPaneState, validatePaneState } from '../../utils/tabUtils/tabUtils';

const PaneTabsContext = createContext();

/**
 * Custom hook to access the PaneTabsContext
 * @returns {Object} The pane tabs context value
 */
export const usePaneTabs = () => {
    const context = useContext(PaneTabsContext);
    if (!context) {
        throw new Error('usePaneTabs must be used within a PaneTabsProvider');
    }
    return context;
};

/**
 * Optimized PaneTabsProvider with better performance and cleaner code
 */
export const PaneTabsProvider = ({ children }) => {
    // Store tabs per pane: { [paneId]: { tabs: [], activeTabIndex: number } }
    const [paneTabsState, setPaneTabsState] = useState({});
    const [isNavigatingToTab, setIsNavigatingToTab] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { activePaneId, getAllPaneIds, closePane } = useLayout();
    const closePaneRef = useRef(closePane);
    const previousActivePaneIdRef = useRef(activePaneId);
    
    // Keep ref updated
    useEffect(() => {
        closePaneRef.current = closePane;
    }, [closePane]);

    /**
     * Safely navigates to a path with error handling
     */
    const safeNavigate = useCallback((path) => {
        try {
            setIsNavigatingToTab(true);
            navigate(path);
        } catch (error) {
            console.error('Navigation failed:', error);
            setIsNavigatingToTab(false);
        }
    }, [navigate]);

    /**
     * Initialize tabs for a pane if it doesn't exist
     */
    const initializePaneIfNeeded = useCallback((paneId, initialPath) => {
        setPaneTabsState(current => {
            if (current[paneId]) {
                return current;
            }
            
            const path = initialPath || location.pathname || '/';
            return {
                ...current,
                [paneId]: createPaneState(path),
            };
        });
    }, [location.pathname]);

    // Initialize active pane on mount (only if it doesn't exist yet)
    useEffect(() => {
        if (activePaneId && !paneTabsState[activePaneId]) {
            initializePaneIfNeeded(activePaneId);
        }
    }, [activePaneId, paneTabsState, initializePaneIfNeeded]);

    // Update active pane's tab when location changes
    useEffect(() => {
        if (!location.pathname || !activePaneId) return;

        if (shouldExcludeFromTabs(location.pathname)) {
            return;
        }

        // Check if active pane just changed
        const paneJustChanged = previousActivePaneIdRef.current !== activePaneId;
        previousActivePaneIdRef.current = activePaneId;
        
        // When the pane changes, we DON'T want to update tabs from location
        // because the location will be updated by activatePane
        if (paneJustChanged) {
            return;
        }

        // Skip if we're in the middle of a programmatic navigation
        if (isNavigatingToTab) {
            setIsNavigatingToTab(false);
            return;
        }

        setPaneTabsState(currentState => {
            const paneState = currentState[activePaneId];
            if (!paneState) {
                // Initialize if needed
                return {
                    ...currentState,
                    [activePaneId]: createPaneState(location.pathname),
                };
            }

            // Update the active tab in the active pane with the current location
            // This handles cases where the user navigates within a component
            const newTabs = [...paneState.tabs];
            const activeIdx = paneState.activeTabIndex;
            
            if (newTabs.length === 0) {
                // If pane has no tabs, create a new tab with the current location
                const newTab = createTab(location.pathname);
                return {
                    ...currentState,
                    [activePaneId]: {
                        tabs: [newTab],
                        activeTabIndex: 0,
                    },
                };
            } else if (Number.isInteger(activeIdx) && activeIdx >= 0 && activeIdx < newTabs.length) {
                // Update existing active tab (only if activeIdx is a valid integer)
                newTabs[activeIdx] = {
                    ...newTabs[activeIdx],
                    path: location.pathname,
                    title: getTitleForPath(location.pathname),
                    icon: getIconForPath(location.pathname),
                };
            } else {
                // If there are tabs but no valid active tab (invalid index, NaN, negative, etc.)
                // Navigate to the last tab
                const lastTabIndex = newTabs.length - 1;
                newTabs[lastTabIndex] = {
                    ...newTabs[lastTabIndex],
                    path: location.pathname,
                    title: getTitleForPath(location.pathname),
                    icon: getIconForPath(location.pathname),
                };
                
                return {
                    ...currentState,
                    [activePaneId]: {
                        ...paneState,
                        tabs: newTabs,
                        activeTabIndex: lastTabIndex,
                    },
                };
            }

            return {
                ...currentState,
                [activePaneId]: {
                    ...paneState,
                    tabs: newTabs,
                },
            };
        });
    }, [location.pathname, activePaneId, isNavigatingToTab]);

    /**
     * Opens a new tab in a specific pane
     */
    const openTab = useCallback((paneId, path) => {
        const newTab = createTab(path);

        setPaneTabsState(current => {
            const paneState = current[paneId];
            
            // If pane doesn't exist, create it with the new tab
            if (!paneState) {
                return {
                    ...current,
                    [paneId]: {
                        tabs: [newTab],
                        activeTabIndex: 0,
                    },
                };
            }
            
            // If pane exists, add the new tab to it
            const newTabs = [...paneState.tabs, newTab];
            const newIndex = newTabs.length - 1;

            return {
                ...current,
                [paneId]: {
                    tabs: newTabs,
                    activeTabIndex: newIndex,
                },
            };
        });

        // Only navigate if this is the active pane
        if (paneId === activePaneId) {
            safeNavigate(path);
        }
    }, [safeNavigate, activePaneId]);

    /**
     * Closes a tab in a specific pane
     */
    const closeTab = useCallback((paneId, index) => {
        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState)) {
                return current;
            }

            const tabs = paneState.tabs;
            const activeTabIndex = paneState.activeTabIndex;

            // If it's the last tab, check if there are other panes
            if (tabs.length === 1) {
                const allPaneIds = getAllPaneIds();
                
                // If there are multiple panes, close this pane
                if (allPaneIds.length > 1) {
                    requestAnimationFrame(() => closePaneRef.current(paneId));
                    
                    // Return empty tabs for this pane (will be cleaned up when pane closes)
                    return {
                        ...current,
                        [paneId]: {
                            tabs: [],
                            activeTabIndex: 0,
                        },
                    };
                }
                
                // If there's only one pane total, allow closing the last tab
                // This will result in an empty pane, which is now allowed
                return {
                    ...current,
                    [paneId]: {
                        tabs: [],
                        activeTabIndex: 0,
                    },
                };
            }

            const newTabs = tabs.filter((_, i) => i !== index);
            let newActiveIndex = activeTabIndex;

            // Adjust active tab index
            if (index === activeTabIndex) {
                newActiveIndex = index > 0 ? index - 1 : 0;
                // Only navigate if this is the active pane
                if (paneId === activePaneId && newTabs[newActiveIndex]) {
                    safeNavigate(newTabs[newActiveIndex].path);
                }
            } else if (index < activeTabIndex) {
                newActiveIndex = activeTabIndex - 1;
            }

            return {
                ...current,
                [paneId]: {
                    tabs: newTabs,
                    activeTabIndex: newActiveIndex,
                },
            };
        });
    }, [safeNavigate, getAllPaneIds]);

    /**
     * Switches to a specific tab in a pane
     */
    const switchToTab = useCallback((paneId, index) => {
        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState) || index < 0 || index >= paneState.tabs.length) {
                return current;
            }

            // Only navigate if this is the active pane
            if (paneId === activePaneId) {
                safeNavigate(paneState.tabs[index].path);
            }

            return {
                ...current,
                [paneId]: {
                    ...paneState,
                    activeTabIndex: index,
                },
            };
        });
    }, [safeNavigate, activePaneId]);

    /**
     * Closes all tabs except the specified one
     */
    const closeOtherTabs = useCallback((paneId, index) => {
        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState) || index < 0 || index >= paneState.tabs.length) {
                return current;
            }

            const tabToKeep = paneState.tabs[index];
            
            // Only navigate if this is the active pane
            if (paneId === activePaneId) {
                safeNavigate(tabToKeep.path);
            }

            return {
                ...current,
                [paneId]: {
                    tabs: [tabToKeep],
                    activeTabIndex: 0,
                },
            };
        });
    }, [safeNavigate, activePaneId]);

    /**
     * Closes all tabs to the right of the specified one
     */
    const closeTabsToRight = useCallback((paneId, index) => {
        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState) || index < 0 || index >= paneState.tabs.length) {
                return current;
            }

            const newTabs = paneState.tabs.slice(0, index + 1);
            let newActiveIndex = paneState.activeTabIndex;
            
            // Adjust active tab if needed
            if (paneState.activeTabIndex > index) {
                newActiveIndex = index;
                // Only navigate if this is the active pane
                if (paneId === activePaneId) {
                    safeNavigate(newTabs[index].path);
                }
            }

            return {
                ...current,
                [paneId]: {
                    tabs: newTabs,
                    activeTabIndex: newActiveIndex,
                },
            };
        });
    }, [safeNavigate, activePaneId]);

    /**
     * Reorders tabs by moving a tab from one index to another
     */
    const reorderTabs = useCallback((paneId, fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;

        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState)) {
                return current;
            }

            const newTabs = [...paneState.tabs];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, movedTab);

            let newActiveIndex = paneState.activeTabIndex;
            if (fromIndex === paneState.activeTabIndex) {
                newActiveIndex = toIndex;
            } else if (fromIndex < paneState.activeTabIndex && toIndex >= paneState.activeTabIndex) {
                newActiveIndex = paneState.activeTabIndex - 1;
            } else if (fromIndex > paneState.activeTabIndex && toIndex <= paneState.activeTabIndex) {
                newActiveIndex = paneState.activeTabIndex + 1;
            }

            return {
                ...current,
                [paneId]: {
                    tabs: newTabs,
                    activeTabIndex: newActiveIndex,
                },
            };
        });
    }, []);

    /**
     * Creates a new tab in a specific pane
     */
    const createNewTab = useCallback((paneId) => {
        const welcomeTab = createTab('/');
        
        setPaneTabsState(current => {
            const paneState = current[paneId];
            
            // If pane doesn't exist, create it with the new tab
            if (!paneState) {
                return {
                    ...current,
                    [paneId]: {
                        tabs: [welcomeTab],
                        activeTabIndex: 0,
                    },
                };
            }
            
            // If pane exists, add the new tab to it
            const newTabs = [...paneState.tabs, welcomeTab];
            const newIndex = newTabs.length - 1;

            return {
                ...current,
                [paneId]: {
                    tabs: newTabs,
                    activeTabIndex: newIndex,
                },
            };
        });

        // Only navigate if this is the active pane
        if (paneId === activePaneId) {
            safeNavigate('/');
        }
    }, [safeNavigate, activePaneId]);

    /**
     * Gets the tabs state for a specific pane
     */
    const getPaneTabsState = useCallback((paneId) => {
        return paneTabsState[paneId] || { tabs: [], activeTabIndex: 0 };
    }, [paneTabsState]);

    /**
     * Updates the title of the current tab in a pane
     */
    const updateCurrentTabTitle = useCallback((paneId, title) => {
        setPaneTabsState(current => {
            const paneState = current[paneId];
            if (!paneState || !validatePaneState(paneState)) {
                return current;
            }

            const newTabs = [...paneState.tabs];
            const activeIndex = paneState.activeTabIndex;
            
            if (activeIndex >= 0 && activeIndex < newTabs.length) {
                newTabs[activeIndex] = {
                    ...newTabs[activeIndex],
                    title: title,
                };
            }

            return {
                ...current,
                [paneId]: {
                    ...paneState,
                    tabs: newTabs,
                },
            };
        });
    }, []);

    /**
     * Moves a tab from one pane to another, or reorders within the same pane.
     */
    const moveTabBetweenPanes = useCallback((fromPaneId, fromIndex, toPaneId, toIndex = -1) => {
        if (fromPaneId === toPaneId) {
            // Same pane - use reorderTabs
            if (toIndex >= 0) {
                reorderTabs(fromPaneId, fromIndex, toIndex);
            }
            return;
        }

        // Get all pane IDs to check if we should close the source pane
        const allPaneIds = getAllPaneIds();

        setPaneTabsState(current => {
            const fromPaneState = current[fromPaneId];
            // Initialize target pane if it doesn't exist
            const toPaneState = current[toPaneId] || createPaneState();
            
            if (!fromPaneState || !validatePaneState(fromPaneState)) {
                return current;
            }
            
            if (fromIndex < 0 || fromIndex >= fromPaneState.tabs.length) {
                return current;
            }

            // Get the tab to move (deep copy to avoid reference issues)
            const tabToMove = { ...fromPaneState.tabs[fromIndex] };
            
            // Remove from source pane
            const newFromTabs = fromPaneState.tabs.filter((_, i) => i !== fromIndex);
            let newFromActiveIndex = fromPaneState.activeTabIndex;
            
            // Adjust active index in source pane
            if (fromIndex === fromPaneState.activeTabIndex) {
                newFromActiveIndex = newFromTabs.length > 0 ? (fromIndex > 0 ? fromIndex - 1 : 0) : 0;
            } else if (fromIndex < fromPaneState.activeTabIndex) {
                newFromActiveIndex = fromPaneState.activeTabIndex - 1;
            }

            // Check if we need to close the source pane
            const shouldCloseSourcePane = newFromTabs.length === 0 && allPaneIds.length > 1;
            
            if (shouldCloseSourcePane) {
                requestAnimationFrame(() => {
                    closePaneRef.current(fromPaneId);
                });
                
                // Only update target pane
                const newToTabs = [...toPaneState.tabs];
                const insertIndex = toIndex >= 0 ? toIndex : newToTabs.length;
                newToTabs.splice(insertIndex, 0, tabToMove);
                
                return {
                    ...current,
                    [fromPaneId]: {
                        tabs: [],
                        activeTabIndex: 0,
                    },
                    [toPaneId]: {
                        tabs: newToTabs,
                        activeTabIndex: insertIndex,
                    },
                };
            }

            // Add to target pane
            const newToTabs = [...toPaneState.tabs];
            const insertIndex = toIndex >= 0 ? toIndex : newToTabs.length;
            newToTabs.splice(insertIndex, 0, tabToMove);
            
            // Set the moved tab as active in target pane
            const newToActiveIndex = insertIndex;

            const newState = {
                ...current,
                [fromPaneId]: {
                    tabs: newFromTabs,
                    activeTabIndex: Math.min(newFromActiveIndex, Math.max(0, newFromTabs.length - 1)),
                },
                [toPaneId]: {
                    tabs: newToTabs,
                    activeTabIndex: newToActiveIndex,
                },
            };

            if (toPaneId === activePaneId) {
                safeNavigate(tabToMove.path);
            }
            return newState;
        });
    }, [safeNavigate, activePaneId, reorderTabs, getAllPaneIds]);

    /**
     * Transfers all tabs from one pane to another.
     */
    const transferTabs = useCallback((fromPaneId, toPaneId, removeSource = true) => {
        setPaneTabsState(current => {
            const fromPaneState = current[fromPaneId];
            const toPaneState = current[toPaneId] || createPaneState();

            if (!fromPaneState || !validatePaneState(fromPaneState)) {
                return current;
            }

            const newToTabs = [...toPaneState.tabs, ...fromPaneState.tabs];
            const newToActiveIndex = newToTabs.length - 1; // Activate the last transferred tab

            const newState = {
                ...current,
                [toPaneId]: {
                    tabs: newToTabs,
                    activeTabIndex: newToActiveIndex,
                },
            };
            
            // Optionally remove the source pane state
            if (removeSource) {
                delete newState[fromPaneId];
            }
            
            return newState;
        });
    }, []);

    /**
     * Pre-initializes panes with default tabs.
     */
    const preInitializePanes = useCallback((paneIds) => {
        setPaneTabsState(current => {
            const newState = { ...current };
            paneIds.forEach(paneId => {
                if (!newState[paneId]) {
                    newState[paneId] = createPaneState('/');
                }
            });
            return newState;
        });
    }, []);

    /**
     * Handles the logic for splitting a pane and moving a tab into the new pane.
     */
    const handleSplitWithTab = useCallback((oldPaneId, originalPaneId, newPaneId, sourcePaneId, sourceIndex) => {
        const allPaneIds = getAllPaneIds();
        
        setPaneTabsState(current => {
            // Get the old pane's tabs
            const oldPaneState = current[oldPaneId];
            if (!oldPaneState || !validatePaneState(oldPaneState)) {
                return current;
            }
            
            // Determine the actual source pane ID after the split
            const actualSourcePaneId = (sourcePaneId === oldPaneId) ? originalPaneId : sourcePaneId;
            const actualSourceState = (sourcePaneId === oldPaneId) ? oldPaneState : current[sourcePaneId];
            
            if (!actualSourceState || !validatePaneState(actualSourceState)) {
                return current;
            }
            
            if (sourceIndex < 0 || sourceIndex >= actualSourceState.tabs.length) {
                return current;
            }
            
            // Get the tab to move
            const tabToMove = { ...actualSourceState.tabs[sourceIndex] };
            
            // Build new state
            const newState = { ...current };
            
            // Remove old pane ID
            delete newState[oldPaneId];
            
            // Create original pane with existing tabs (or without the moved tab if same pane)
            let newTabs = [];
            let newActiveIndex = 0;

            if (sourcePaneId === oldPaneId) {
                // If the dragged tab was from the pane being split, remove it from the original pane's new tabs
                newTabs = oldPaneState.tabs.filter((_, i) => i !== sourceIndex);
                newActiveIndex = newTabs.length > 0 ? (sourceIndex > 0 ? sourceIndex - 1 : 0) : 0;
            } else {
                // Otherwise, the original pane keeps all its tabs
                newTabs = [...oldPaneState.tabs];
                newActiveIndex = oldPaneState.activeTabIndex;
            }

            newState[originalPaneId] = {
                tabs: newTabs,
                activeTabIndex: Math.min(newActiveIndex, Math.max(0, newTabs.length - 1)),
            };

            // If the source pane was the one being split, and it now has no tabs, close it
            if (sourcePaneId === oldPaneId) {
                if (newTabs.length === 0 && allPaneIds.length > 1) {
                    delete newState[originalPaneId];
                    requestAnimationFrame(() => closePaneRef.current(originalPaneId));
                }
            } else {
                // If the source pane was a different pane, update its tabs
                const sourceState = current[sourcePaneId];
                newTabs = sourceState.tabs.filter((_, i) => i !== sourceIndex);
                newActiveIndex = sourceState.activeTabIndex;
                if (sourceIndex === sourceState.activeTabIndex) {
                    newActiveIndex = newTabs.length > 0 ? (sourceIndex > 0 ? sourceIndex - 1 : 0) : 0;
                } else if (sourceIndex < sourceState.activeTabIndex) {
                    newActiveIndex = sourceState.activeTabIndex - 1;
                }
                
                // Check if source pane should be closed
                if (newTabs.length === 0 && allPaneIds.length > 1) {
                    delete newState[actualSourcePaneId];
                    requestAnimationFrame(() => closePaneRef.current(actualSourcePaneId));
                } else {
                    newState[actualSourcePaneId] = {
                        tabs: newTabs,
                        activeTabIndex: Math.min(newActiveIndex, Math.max(0, newTabs.length - 1)),
                    };
                }
            }

            // Add the moved tab to the new pane
            newState[newPaneId] = {
                tabs: [tabToMove],
                activeTabIndex: 0,
            };
            
            return newState;
        });
    }, [getAllPaneIds]);

    /**
     * Activates a pane by navigating to its currently active tab.
     */
    const activatePane = useCallback((paneId) => {
        const paneState = paneTabsState[paneId];
        if (paneState && validatePaneState(paneState)) {
            const activeTab = paneState.tabs[paneState.activeTabIndex];
            if (activeTab && activeTab.path) {
                safeNavigate(activeTab.path);
            }
        }
    }, [paneTabsState, safeNavigate]);

    // Clean up tabs for panes that no longer exist
    useEffect(() => {
        const currentPaneIds = getAllPaneIds();
        const currentPaneIdSet = new Set(currentPaneIds);
        
        setPaneTabsState(current => {
            // Check if there are any orphaned panes
            const stateKeys = Object.keys(current);
            const hasOrphans = stateKeys.some(key => !currentPaneIdSet.has(key));
            
            // Only update if we actually have orphaned panes
            if (!hasOrphans) {
                return current;
            }
            
            const newState = {};
            currentPaneIds.forEach(paneId => {
                if (current[paneId]) {
                    newState[paneId] = current[paneId];
                }
            });
            return newState;
        });
    }, [getAllPaneIds]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        paneTabsState,
        openTab,
        closeTab,
        switchToTab,
        closeOtherTabs,
        closeTabsToRight,
        reorderTabs,
        updateCurrentTabTitle,
        createNewTab,
        getPaneTabsState,
        initializePaneIfNeeded,
        activatePane,
        moveTabBetweenPanes,
        transferTabs,
        preInitializePanes,
        handleSplitWithTab,
    }), [
        paneTabsState,
        openTab,
        closeTab,
        switchToTab,
        closeOtherTabs,
        closeTabsToRight,
        reorderTabs,
        updateCurrentTabTitle,
        createNewTab,
        getPaneTabsState,
        initializePaneIfNeeded,
        activatePane,
        moveTabBetweenPanes,
        transferTabs,
        preInitializePanes,
        handleSplitWithTab,
    ]);

    return <PaneTabsContext.Provider value={contextValue}>{children}</PaneTabsContext.Provider>;
};