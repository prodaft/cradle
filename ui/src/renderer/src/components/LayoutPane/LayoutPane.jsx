import React, { Suspense, useEffect, useRef, useState } from 'react';
import { matchPath, UNSAFE_RouteContext as RouteContext, useNavigate } from 'react-router-dom';
import { Xmark, NavArrowDown, Plus, SplitArea } from 'iconoir-react';
import * as Iconoir from 'iconoir-react';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';

// Create outlet context for passing props to child components
const OutletContext = React.createContext(null);
const OutletContextProvider = OutletContext.Provider;

// Global variable to track current drag operation
let currentDragInfo = null;

// Import all route components
const NoteEditor = React.lazy(() => import('../NoteEditor/NoteEditor.jsx'));
const Documents = React.lazy(() => import('../Documents/Documents.jsx'));
const Files = React.lazy(() => import('../Files/Files.jsx'));
const FeatureNotImplemented = React.lazy(() => import('../FeatureNotImplemented/FeatureNotImplemented.jsx'));
const Dashboard = React.lazy(() => import('../Dashboard/Dashboard.jsx'));
const NoteViewer = React.lazy(() => import('../NoteViewer/NoteViewer.jsx'));
const NoteSelector = React.lazy(() => import('../NoteSelector/NoteSelector.jsx'));
const Welcome = React.lazy(() => import('../Welcome/Welcome.jsx'));
const ActivityList = React.lazy(() => import('../ActivityList/ActivityList.jsx'));
const GraphSearch = React.lazy(() => import('../GraphQuery/GraphSearch.jsx'));
const GraphExplorer = React.lazy(() => import('../GraphExplorer/GraphExplorer.jsx'));
const Reports = React.lazy(() => import('../Reports/Reports.jsx'));
const ReportList = React.lazy(() => import('../ReportList/ReportList.jsx'));
const Publish = React.lazy(() => import('../Publish/Publish.jsx'));
const FleetingNoteEditor = React.lazy(() => import('../FleetingNoteEditor/FleetingNoteEditor.jsx'));
const AccountSettings = React.lazy(() => import('../AccountSettings/AccountSettings.jsx'));
const AdminPanel = React.lazy(() => import('../AdminPanel/AdminPanel.jsx'));
const DigestData = React.lazy(() => import('../DigestData/DigestData.jsx'));

/**
 * Define route configurations
 */
const routeConfigs = [
    { path: '/notes/:id/edit', component: NoteEditor },
    { path: '/notes/:id', component: NoteViewer },
    { path: '/notes', component: NoteSelector },
    { path: '/editor/:id', component: FleetingNoteEditor },
    { path: '/dashboards/:subtype/:name', component: Dashboard },
    { path: '/admin/add/user', component: () => <AccountSettings isEdit={false} /> },
    { path: '/admin', component: AdminPanel },
    { path: '/reports/:report_id', component: ReportList },
    { path: '/knowledge-graph', component: () => <GraphExplorer GraphSearchComponent={GraphSearch} /> },
    { path: '/not-implemented', component: FeatureNotImplemented },
    { path: '/documents', component: Documents },
    { path: '/files', component: Files },
    { path: '/digest-data', component: DigestData },
    { path: '/connectivity', component: Reports },
    { path: '/publish', component: Publish },
    { path: '/activity/:username', component: ActivityList },
    { path: '/activity', component: ActivityList },
    { path: '/account', component: () => <AccountSettings target='me' /> },
    { path: '/', exact: true, component: Welcome },
];

/**
 * Find the matching route configuration for a given path
 */
const findMatchingRoute = (path) => {
    for (const route of routeConfigs) {
        const match = matchPath({ path: route.path, end: route.exact !== false }, path);
        if (match) {
            return { route, match };
        }
    }
    return null;
};

/**
 * CachedTabContent - Renders and caches a single tab's content
 */
const CachedTabContent = ({ path, outletContext }) => {
    const [routeInfo, setRouteInfo] = useState(null);
    
    useEffect(() => {
        const matched = findMatchingRoute(path);
        if (matched) {
            setRouteInfo(matched);
        }
    }, [path]);
    
    if (!routeInfo) {
        return null;
    }
    
    const Component = routeInfo.route.component;
    const params = routeInfo.match.params || {};
    const { pathname, pathnameBase, pattern } = routeInfo.match;
    
    const matches = [
        {
            id: pattern.path,
            pathname: pathname,
            params: params,
            pathnameBase: pathnameBase || pathname,
            route: {
                path: pattern.path,
                id: pattern.path,
            }
        }
    ];
    
    const routeContextValue = {
        outlet: null,
        matches: matches,
        isDataRoute: false,
    };
    
    return (
        <RouteContext.Provider value={routeContextValue}>
            <OutletContextProvider value={outletContext}>
                <Suspense fallback={null}>
                    <Component />
                </Suspense>
            </OutletContextProvider>
        </RouteContext.Provider>
    );
};

/**
 * PaneTabs component - Tab bar for a single pane
 */
const PaneTabs = ({ paneId, isActive }) => {
    const { getPaneTabsState, switchToTab, closeTab, closeOtherTabs, closeTabsToRight, reorderTabs, createNewTab, moveTabBetweenPanes } = usePaneTabs();
    const { splitPane, setActivePaneId } = useLayout();
    const navigate = useNavigate();
    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;
    
    const [contextMenuTab, setContextMenuTab] = useState(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [draggedTab, setDraggedTab] = useState(null);
    const [dragOverTab, setDragOverTab] = useState(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const contextMenuRef = useRef(null);
    const tabBarRef = useRef(null);

    const handleContextMenu = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuTab(index);
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleCloseContextMenu = () => {
        setContextMenuTab(null);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                handleCloseContextMenu();
            }
        };

        if (contextMenuTab !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
        
        // Always return cleanup function
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenuTab]);

    const handleTabClick = (index) => {
        if (isActive) {
            // Pane is already active - just switch tabs (switchToTab will navigate)
            switchToTab(paneId, index);
        } else {
            // Pane is not active - we need to:
            // 1. Update the active tab index
            // 2. Activate the pane
            // 3. Navigate to the tab
            
            // Update tab index first
            switchToTab(paneId, index);
            
            // Then activate pane (with a small delay to ensure state is updated)
            requestAnimationFrame(() => {
                setActivePaneId(paneId);
            });
        }
    };

    const handleCloseClick = (e, index) => {
        e.stopPropagation();
        closeTab(paneId, index);
    };

    const handleDragStart = (e, index) => {
        setDraggedTab(index);
        e.dataTransfer.effectAllowed = 'move';
        
        const dragInfo = {
            paneId: paneId,
            tabIndex: index,
            tabCount: tabs.length,
        };
        
        // Store in global variable for drop zone calculations
        currentDragInfo = dragInfo;
        
        // Store the pane ID and tab index for cross-pane dragging
        e.dataTransfer.setData('application/x-cradle-tab', JSON.stringify(dragInfo));
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Check if we have local drag or need to handle cross-pane
        const isSameTab = draggedTab === index;
        
        if (!isSameTab) {
            const rect = e.currentTarget.getBoundingClientRect();
            const midPoint = rect.left + rect.width / 2;
            const dropBefore = e.clientX < midPoint;
            setDragOverTab({ index, dropBefore });
        }
    };

    const handleDragLeave = () => {
        setDragOverTab(null);
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        
        const dataStr = e.dataTransfer.getData('application/x-cradle-tab');
        if (!dataStr) return;
        
        let dragData;
        try {
            dragData = JSON.parse(dataStr);
        } catch (error) {
            console.error('Failed to parse drag data:', error);
            return;
        }
        
        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;
        
        // Validate drag data
        if (!sourcePaneId || sourceIndex === undefined || sourceIndex < 0) {
            console.warn('Invalid drag data:', dragData);
            return;
        }
        
        if (dragOverTab) {
            let targetIndex = index;
            
            if (sourcePaneId === paneId) {
                // Same pane - reorder
                if (sourceIndex !== index) {
                    if (!dragOverTab.dropBefore && index < sourceIndex) {
                        targetIndex = index;
                    } else if (!dragOverTab.dropBefore && index > sourceIndex) {
                        targetIndex = index;
                    } else if (dragOverTab.dropBefore && index > sourceIndex) {
                        targetIndex = index - 1;
                    } else if (dragOverTab.dropBefore && index < sourceIndex) {
                        targetIndex = index;
                    }
                    reorderTabs(paneId, sourceIndex, targetIndex);
                }
            } else {
                // Different pane - move between panes
                if (dragOverTab.dropBefore) {
                    targetIndex = index;
                } else {
                    targetIndex = index + 1;
                }
                moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, targetIndex);
                setActivePaneId(paneId);
            }
        }
        
        setDraggedTab(null);
        setDragOverTab(null);
        setIsDraggedOver(false);
    };

    const handleDragEnd = () => {
        setDraggedTab(null);
        setDragOverTab(null);
        setIsDraggedOver(false);
        currentDragInfo = null; // Clear global drag info
    };

    /**
     * Handles drag over the tab bar (for dropping at the end)
     */
    const handleTabBarDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDraggedOver(true);
    };

    /**
     * Handles drag leave from tab bar
     */
    const handleTabBarDragLeave = (e) => {
        // Only set to false if we're leaving the tab bar itself
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setIsDraggedOver(false);
        }
    };

    /**
     * Handles drop on the tab bar (at the end)
     */
    const handleTabBarDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const dataStr = e.dataTransfer.getData('application/x-cradle-tab');
        if (!dataStr) return;
        
        const dragData = JSON.parse(dataStr);
        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;
        
        if (sourcePaneId !== paneId) {
            // Move to end of this pane
            moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, -1);
            setActivePaneId(paneId);
        }
        
        setDraggedTab(null);
        setDragOverTab(null);
        setIsDraggedOver(false);
    };

    const getIconComponent = (iconName) => {
        const IconComponent = Iconoir[iconName];
        const iconProps = { width: '1em', height: '1em', strokeWidth: 1.5 };
        return IconComponent ? <IconComponent {...iconProps} /> : <Iconoir.Page {...iconProps} />;
    };

    if (!tabs || tabs.length === 0) {
        return null;
    }

    return (
        <div 
            ref={tabBarRef}
            className={`flex items-center h-10 cradle-bg-elevated overflow-x-auto overflow-y-hidden cradle-scrollbar-thin ${isActive ? 'cradle-border-b' : 'cradle-border-b border-opacity-50'} ${isDraggedOver ? 'ring-2 ring-inset ring-[#FF8C00]' : ''}`}
            onDragOver={handleTabBarDragOver}
            onDragLeave={handleTabBarDragLeave}
            onDrop={handleTabBarDrop}
        >
            {tabs.map((tab, index) => {
                const isTabActive = index === activeTabIndex;
                const isDragging = draggedTab === index;
                const showDropBefore = dragOverTab?.index === index && dragOverTab?.dropBefore;
                const showDropAfter = dragOverTab?.index === index && !dragOverTab?.dropBefore;
                
                return (
                    <div key={`tab-wrapper-${tab.id}`} className='relative flex items-center h-full'>
                        {showDropBefore && (
                            <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-[#FF8C00] z-10' />
                        )}
                        
                        <div
                            draggable
                            className={`
                                flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px]
                                cursor-move group relative
                                ${isTabActive 
                                    ? 'cradle-bg-primary border-l border-r cradle-border cradle-text-secondary border-b border-cradle-bg-primary' 
                                    : 'cradle-bg-elevated cradle-text-tertiary cradle-border'
                                }
                                ${isDragging ? 'opacity-50' : ''}
                                ${isTabActive && isActive ? 'border-t-2 border-t-[#FF8C00]' : 'border-t cradle-border'}
                            `}
                            onClick={() => handleTabClick(index)}
                            onContextMenu={(e) => handleContextMenu(e, index)}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            title={tab.title}
                        >
                            <div className='flex-shrink-0' style={{ width: '1em', height: '1em' }}>
                                {getIconComponent(tab.icon)}
                            </div>
                            
                            <span className='flex-1 truncate text-sm cradle-mono'>
                                {tab.title}
                            </span>
                            
                            <button
                                className={`
                                    flex-shrink-0 rounded p-0.5
                                    border border-transparent hover:cradle-border
                                    ${isTabActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                `}
                                onClick={(e) => handleCloseClick(e, index)}
                                title='Close'
                            >
                                <Xmark width='0.9em' height='0.9em' />
                            </button>
                        </div>
                        
                        {showDropAfter && (
                            <div className='absolute right-0 top-0 bottom-0 w-0.5 bg-[#FF8C00] z-10' />
                        )}
                    </div>
                );
            })}

            <button
                className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:border-[#FF8C00] border border-transparent cradle-border-l'
                onClick={() => createNewTab(paneId)}
                title='New Tab'
            >
                <Plus width='1.2em' height='1.2em' />
            </button>

            <div className='flex-1'></div>

            {isActive && (
                <>
                    <button
                        className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary hover:cradle-bg-secondary cradle-border-l'
                        onClick={() => splitPane(paneId, 'horizontal', 'after')}
                        title='Split Horizontally'
                    >
                        <SplitArea width='1.2em' height='1.2em' style={{ transform: 'rotate(90deg)' }} />
                    </button>

                    <button
                        className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary hover:cradle-bg-secondary cradle-border-l'
                        onClick={() => splitPane(paneId, 'vertical', 'after')}
                        title='Split Vertically'
                    >
                        <SplitArea width='1.2em' height='1.2em' />
                    </button>
                </>
            )}

            {/* Context Menu */}
            {contextMenuTab !== null && (
                <div
                    ref={contextMenuRef}
                    className='fixed z-50 cradle-bg-elevated cradle-border rounded shadow-lg py-1 min-w-[180px]'
                    style={{
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                >
                    <button
                        className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                        onClick={() => {
                            closeTab(paneId, contextMenuTab);
                            handleCloseContextMenu();
                        }}
                    >
                        <Xmark width='1em' height='1em' />
                        Close
                    </button>
                    {tabs.length > 1 && (
                        <button
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                            onClick={() => {
                                closeOtherTabs(paneId, contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' />
                            Close Others
                        </button>
                    )}
                    {contextMenuTab < tabs.length - 1 && (
                        <button
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                            onClick={() => {
                                closeTabsToRight(paneId, contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' style={{ transform: 'rotate(-90deg)' }} />
                            Close to the Right
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * LayoutPane component - A single pane with its own tabs and content
 */
const LayoutPane = ({ paneId, outletContext }) => {
    const { activePaneId, setActivePaneId, splitPane } = useLayout();
    const { getPaneTabsState, initializePaneIfNeeded, activatePane, handleSplitWithTab } = usePaneTabs();
    const isActive = activePaneId === paneId;
    const mountedTabsRef = useRef(new Set());
    const wasActiveRef = useRef(isActive);
    const paneRef = useRef(null);
    const isMountedRef = useRef(true);
    const [dropZone, setDropZone] = useState(null); // 'top', 'bottom', 'left', 'right', or null

    useEffect(() => {
        initializePaneIfNeeded(paneId);
    }, [paneId, initializePaneIfNeeded]);
    
    // Set mounted ref on mount and cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;
    
    // When this pane becomes active, navigate to its active tab
    useEffect(() => {
        const becameActive = isActive && !wasActiveRef.current;
        wasActiveRef.current = isActive;
        
        if (becameActive) {
            // Pane just became active - navigate to its active tab
            activatePane(paneId);
        }
    }, [isActive, activatePane, paneId]);
    
    useEffect(() => {
        if (tabs) {
            tabs.forEach(tab => {
                mountedTabsRef.current.add(tab.path);
            });
            
            const currentPaths = new Set(tabs.map(t => t.path));
            mountedTabsRef.current.forEach(path => {
                if (!currentPaths.has(path)) {
                    mountedTabsRef.current.delete(path);
                }
            });
        }
        
        // Cleanup on unmount
        return () => {
            mountedTabsRef.current.clear();
        };
    }, [tabs]);

    const handlePaneClick = (e) => {
        if (!isActive) {
            // Activate this pane (the effect will handle navigation)
            setActivePaneId(paneId);
        }
    };

    /**
     * Calculates drop zone based on cursor position
     */
    const calculateDropZone = (e) => {
        if (!paneRef.current) return null;
        
        const rect = paneRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const threshold = 100; // pixels from edge
        
        // Check edges in priority order
        if (y < threshold) return 'top';
        if (y > rect.height - threshold) return 'bottom';
        if (x < threshold) return 'left';
        if (x > rect.width - threshold) return 'right';
        
        return null;
    };

    /**
     * Handles drag over the pane content area
     */
    const handlePaneDragOver = (e) => {
        // Check if we're dragging a tab
        const types = e.dataTransfer.types;
        if (!types.includes('application/x-cradle-tab')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Check if splitting is possible using the global drag info
        if (currentDragInfo) {
            const { paneId: sourcePaneId, tabCount } = currentDragInfo;
            
            // If dragging from the same pane and it only has one tab, don't show drop zones
            if (sourcePaneId === paneId && tabCount <= 1) {
                setDropZone(null);
                return;
            }
        }
        
        const zone = calculateDropZone(e);
        setDropZone(zone);
    };

    /**
     * Handles drag leave from pane
     */
    const handlePaneDragLeave = (e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setDropZone(null);
        }
    };

    /**
     * Handles drop on the pane (for split creation)
     */
    const handlePaneDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const dataStr = e.dataTransfer.getData('application/x-cradle-tab');
        if (!dataStr || !dropZone) {
            setDropZone(null);
            currentDragInfo = null;
            return;
        }
        
        const dragData = JSON.parse(dataStr);
        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;
        
        // Validate source pane exists
        if (!sourcePaneId || sourceIndex === undefined || sourceIndex < 0) {
            console.warn('Invalid drag data:', dragData);
            setDropZone(null);
            return;
        }
        
        // Prevent dragging the only tab to split the same pane
        // (You can't split a pane by dragging its only tab to itself - it would leave it empty)
        if (sourcePaneId === paneId) {
            const sourcePaneState = getPaneTabsState(sourcePaneId);
            if (sourcePaneState.tabs.length === 1) {
                console.warn('[LayoutPane handlePaneDrop] Cannot split pane with only one tab by dragging to itself');
                setDropZone(null);
                return;
            }
        }
        
        // Debug logging removed for production
        
        // Split the pane and get the new IDs
        const direction = (dropZone === 'top' || dropZone === 'bottom') ? 'horizontal' : 'vertical';
        const position = (dropZone === 'top' || dropZone === 'left') ? 'before' : 'after';
        const { originalPaneId, newPaneId } = splitPane(paneId, direction, position);
        
        // Debug logging removed for production
        
        setDropZone(null);
        currentDragInfo = null;
        
        // Call handleSplitWithTab IMMEDIATELY before component unmounts
        // (splitting causes this component to unmount)
        handleSplitWithTab(paneId, originalPaneId, newPaneId, sourcePaneId, sourceIndex);
        
        // Activate the new pane after state settles
        requestAnimationFrame(() => {
            setActivePaneId(newPaneId);
        });
    };

    return (
        <div 
            ref={paneRef}
            className='flex flex-col h-full w-full relative'
            onClick={handlePaneClick}
            onMouseDown={handlePaneClick}
            onDragOver={handlePaneDragOver}
            onDragLeave={handlePaneDragLeave}
            onDrop={handlePaneDrop}
        >
            {/* Drop zone indicators */}
            {dropZone === 'top' && (
                <div className='absolute top-0 left-0 right-0 h-1/3 bg-[#FF8C00] bg-opacity-20 border-2 border-[#FF8C00] border-dashed z-50 pointer-events-none' />
            )}
            {dropZone === 'bottom' && (
                <div className='absolute bottom-0 left-0 right-0 h-1/3 bg-[#FF8C00] bg-opacity-20 border-2 border-[#FF8C00] border-dashed z-50 pointer-events-none' />
            )}
            {dropZone === 'left' && (
                <div className='absolute top-0 left-0 bottom-0 w-1/3 bg-[#FF8C00] bg-opacity-20 border-2 border-[#FF8C00] border-dashed z-50 pointer-events-none' />
            )}
            {dropZone === 'right' && (
                <div className='absolute top-0 right-0 bottom-0 w-1/3 bg-[#FF8C00] bg-opacity-20 border-2 border-[#FF8C00] border-dashed z-50 pointer-events-none' />
            )}
            
            <PaneTabs paneId={paneId} isActive={isActive} />
            <div className='flex-1 overflow-y-auto overflow-x-hidden cradle-scrollbar'>
                {tabs && tabs.map((tab, index) => {
                    const isTabActive = index === activeTabIndex;
                    
                    return (
                        <div
                            key={tab.id}
                            style={{
                                display: isTabActive ? 'block' : 'none',
                                height: '100%',
                                width: '100%',
                            }}
                        >
                            <CachedTabContent 
                                path={tab.path}
                                outletContext={outletContext}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LayoutPane;

