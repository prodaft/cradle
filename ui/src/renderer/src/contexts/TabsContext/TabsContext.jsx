import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shouldExcludeFromTabs, getTitleForPath, getIconForPath, generateTabId } from '../../utils/tabUtils/tabUtils';

const TabsContext = createContext();

/**
 * Custom hook to access the TabsContext
 * @returns {Object} The tabs context value
 */
export const useTabs = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('useTabs must be used within a TabsProvider');
    }
    return context;
};

// shouldExcludeFromTabs moved to utils/tabUtils/tabUtils.js

// getTitleForPath moved to utils/tabUtils/tabUtils.js

// getIconForPath moved to utils/tabUtils/tabUtils.js

// generateTabId moved to utils/tabUtils/tabUtils.js

/**
 * TabsProvider component that manages the state of open tabs
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const TabsProvider = ({ children }) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [isNavigatingToTab, setIsNavigatingToTab] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Update active tab when location changes
    useEffect(() => {
        if (!location.pathname) return;

        // Don't create tabs for excluded paths (login, register, etc.)
        if (shouldExcludeFromTabs(location.pathname)) {
            return;
        }

        setTabs(currentTabs => {
            // If no tabs exist, initialize with current location
            if (currentTabs.length === 0) {
                setActiveTabIndex(0);
                return [{
                    id: generateTabId(),
                    path: location.pathname,
                    title: getTitleForPath(location.pathname),
                    icon: getIconForPath(location.pathname),
                }];
            }

            // When navigating to a tab, don't update anything
            if (isNavigatingToTab) {
                return currentTabs;
            }

            // Only update the active tab if we're navigating within the same tab
            // This preserves tab content when navigating
            const newTabs = [...currentTabs];
            if (activeTabIndex >= 0 && activeTabIndex < newTabs.length) {
                newTabs[activeTabIndex] = {
                    ...newTabs[activeTabIndex],
                    path: location.pathname,
                    title: getTitleForPath(location.pathname),
                    icon: getIconForPath(location.pathname),
                };
            }
            return newTabs;
        });
        
        // Reset the flag after navigation
        if (isNavigatingToTab) {
            setIsNavigatingToTab(false);
        }
    }, [location.pathname, activeTabIndex, isNavigatingToTab]);

    /**
     * Opens a new tab with the given path
     * @param {string} path - The path to open
     */
    const openTab = useCallback((path) => {
        // Always create a new tab
        const newTab = {
            id: generateTabId(),
            path,
            title: getTitleForPath(path),
            icon: getIconForPath(path),
        };
        setTabs(prev => [...prev, newTab]);
        const newIndex = tabs.length;
        setActiveTabIndex(newIndex);
        try {
            setIsNavigatingToTab(true);
            navigate(path);
        } catch (error) {
            console.error('Navigation failed:', error);
            setIsNavigatingToTab(false);
        }
    }, [tabs, navigate]);

    /**
     * Closes a tab by index
     * @param {number} index - The index of the tab to close
     */
    const closeTab = useCallback((index) => {
        if (tabs.length === 1) {
            // When closing the last tab, create a new home tab
            const homeTab = {
                id: generateTabId(),
                path: '/',
                title: 'Welcome',
                icon: 'Dashboard',
            };
            setTabs([homeTab]);
            setActiveTabIndex(0);
            setIsNavigatingToTab(true);
            navigate('/');
            return;
        }

        const newTabs = tabs.filter((_, i) => i !== index);
        setTabs(newTabs);

        // Adjust active tab index
        if (index === activeTabIndex) {
            // Closing the active tab
            setIsNavigatingToTab(true);
            const newActiveIndex = index > 0 ? index - 1 : 0;
            setActiveTabIndex(newActiveIndex);
            navigate(newTabs[newActiveIndex].path);
        } else if (index < activeTabIndex) {
            // Closing a tab before the active one
            setActiveTabIndex(activeTabIndex - 1);
        }
        // If closing a tab after the active one, no need to adjust activeTabIndex
    }, [tabs, activeTabIndex, navigate]);

    /**
     * Switches to a specific tab
     * @param {number} index - The index of the tab to switch to
     */
    const switchToTab = useCallback((index) => {
        if (index >= 0 && index < tabs.length) {
            setIsNavigatingToTab(true);
            setActiveTabIndex(index);
            navigate(tabs[index].path);
        }
    }, [tabs, navigate]);

    /**
     * Closes all tabs except the specified one
     * @param {number} index - The index of the tab to keep
     */
    const closeOtherTabs = useCallback((index) => {
        const tabToKeep = tabs[index];
        setTabs([tabToKeep]);
        setIsNavigatingToTab(true);
        setActiveTabIndex(0);
        navigate(tabToKeep.path);
    }, [tabs, navigate]);

    /**
     * Closes all tabs to the right of the specified one
     * @param {number} index - The index of the tab
     */
    const closeTabsToRight = useCallback((index) => {
        const newTabs = tabs.slice(0, index + 1);
        setTabs(newTabs);
        
        // Adjust active tab if needed
        if (activeTabIndex > index) {
            setIsNavigatingToTab(true);
            setActiveTabIndex(index);
            navigate(newTabs[index].path);
        }
    }, [tabs, activeTabIndex, navigate]);

    /**
     * Reorders tabs by moving a tab from one index to another
     * @param {number} fromIndex - The index of the tab to move
     * @param {number} toIndex - The index to move the tab to
     */
    const reorderTabs = useCallback((fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        
        const newTabs = [...tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        
        setTabs(newTabs);
        
        // Update active tab index if necessary
        if (fromIndex === activeTabIndex) {
            setActiveTabIndex(toIndex);
        } else if (fromIndex < activeTabIndex && toIndex >= activeTabIndex) {
            setActiveTabIndex(activeTabIndex - 1);
        } else if (fromIndex > activeTabIndex && toIndex <= activeTabIndex) {
            setActiveTabIndex(activeTabIndex + 1);
        }
    }, [tabs, activeTabIndex]);

    /**
     * Updates the title of the current tab
     * @param {string} title - The new title for the current tab
     */
    const updateCurrentTabTitle = useCallback((title) => {
        setTabs(currentTabs => {
            if (activeTabIndex >= 0 && activeTabIndex < currentTabs.length) {
                const newTabs = [...currentTabs];
                newTabs[activeTabIndex] = {
                    ...newTabs[activeTabIndex],
                    title: title
                };
                return newTabs;
            }
            return currentTabs;
        });
    }, [activeTabIndex]);

    /**
     * Creates a new tab with the Welcome page
     */
    const createNewTab = useCallback(() => {
        // Always create a new tab with welcome path
        const newTab = {
            id: generateTabId(),
            path: '/',
            title: 'Welcome',
            icon: 'Dashboard',
        };
        setTabs(prev => [...prev, newTab]);
        const newIndex = tabs.length;
        setActiveTabIndex(newIndex);
        setIsNavigatingToTab(true);
        navigate('/');
    }, [tabs, navigate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + W: Close current tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                closeTab(activeTabIndex);
            }
            // Ctrl/Cmd + Tab: Next tab
            else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const nextIndex = (activeTabIndex + 1) % tabs.length;
                switchToTab(nextIndex);
            }
            // Ctrl/Cmd + Shift + Tab: Previous tab
            else if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const prevIndex = activeTabIndex === 0 ? tabs.length - 1 : activeTabIndex - 1;
                switchToTab(prevIndex);
            }
            // Ctrl/Cmd + 1-9: Switch to tab by number
            else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key, 10) - 1;
                if (tabIndex < tabs.length) {
                    switchToTab(tabIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tabs, activeTabIndex, closeTab, switchToTab]);

    const value = {
        tabs,
        activeTabIndex,
        openTab,
        closeTab,
        switchToTab,
        closeOtherTabs,
        closeTabsToRight,
        reorderTabs,
        updateCurrentTabTitle,
        createNewTab,
    };

    return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
};

