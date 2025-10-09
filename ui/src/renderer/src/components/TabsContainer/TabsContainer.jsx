import React, { Suspense, useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { matchPath, UNSAFE_RouteContext as RouteContext, UNSAFE_DataRouterContext as DataRouterContext } from 'react-router-dom';
import { useTabs } from '../../contexts/TabsContext/TabsContext';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

// Create outlet context for passing props to child components
const OutletContext = React.createContext(null);
const OutletContextProvider = OutletContext.Provider;

// Export for use in hooks
export { OutletContext };

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

/**
 * Define route configurations that match the App routes
 * Order matters - more specific routes should come before general ones
 */
const routeConfigs = [
    { path: '/notes/:id/edit', component: NoteEditor },
    { path: '/notes/:id', component: NoteViewer },
    { path: '/notes', component: NoteSelector },
    { path: '/editor/:id', component: FleetingNoteEditor },
    { path: '/dashboards/:dashboard_id', component: Dashboard },
    { path: '/admin/add/user', component: () => <AccountSettings isEdit={false} /> },
    { path: '/admin', component: AdminPanel },
    { path: '/reports/:report_id', component: ReportList },
    { path: '/knowledge-graph', component: () => <GraphExplorer GraphSearchComponent={GraphSearch} /> },
    { path: '/not-implemented', component: FeatureNotImplemented },
    { path: '/documents', component: Documents },
    { path: '/files', component: Files },
    { path: '/connectivity', component: Reports },
    { path: '/publish', component: Publish },
    { path: '/activity', component: ActivityList },
    { path: '/account', component: AccountSettings },
    { path: '/', exact: true, component: Welcome },
];

/**
 * Find the matching route configuration for a given path
 */
const findMatchingRoute = (path) => {
    // Validate path input
    if (!path || typeof path !== 'string') {
        console.warn('Invalid path provided to findMatchingRoute:', path);
        return null;
    }
    
    try {
        for (const route of routeConfigs) {
            const match = matchPath({ path: route.path, end: route.exact !== false }, path);
            if (match) {
                return { route, match };
            }
        }
    } catch (error) {
        console.error('Error matching route for path:', path, error);
    }
    
    return null;
};

/**
 * CachedTabContent - Renders and caches a single tab's content
 * This component mounts once per path and stays mounted (just hidden when inactive)
 */
const CachedTabContent = React.memo(({ path, outletContext }) => {
    const [routeInfo, setRouteInfo] = useState(null);
    const [isMounted, setIsMounted] = useState(true);
    
    const matchedRoute = useMemo(() => {
        return findMatchingRoute(path);
    }, [path]);
    
    useEffect(() => {
        if (matchedRoute && isMounted) {
            setRouteInfo(matchedRoute);
        }
    }, [matchedRoute, isMounted]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setIsMounted(false);
        };
    }, []);
    
    if (!routeInfo) {
        return null;
    }
    
    const Component = routeInfo.route.component;
    const params = routeInfo.match.params || {};
    const { pathname, pathnameBase, pattern } = routeInfo.match;
    
    // Create route context with proper matches array that includes params
    // This is what useParams() reads from
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
                <ErrorBoundary>
                    <Suspense fallback={null}>
                        <Component />
                    </Suspense>
                </ErrorBoundary>
            </OutletContextProvider>
        </RouteContext.Provider>
    );
});

CachedTabContent.displayName = 'CachedTabContent';

/**
 * TabsContainer component - Preserves tab content by keeping them mounted
 * 
 * Key features:
 * 1. Each tab renders its own component instance
 * 2. Components stay mounted when tabs are switched (just hidden with CSS)
 * 3. Component state, form inputs, scroll position, etc. are preserved
 * 4. Only the active tab is visible (display: block), others are hidden (display: none)
 * 
 * How it works:
 * - Each tab gets a stable key based on its path
 * - CachedTabContent mounts once per tab and stays mounted
 * - CSS display property controls visibility without unmounting
 * - This preserves all React component state and DOM state
 */
const TabsContainer = React.memo(({ context }) => {
    const { tabs, activeTabIndex } = useTabs();
    const mountedTabsRef = useRef(new Set());
    
    // Memoize tab paths for better performance
    const tabPaths = useMemo(() => new Set(tabs.map(t => t.path)), [tabs]);
    
    // Track which tabs have been mounted to ensure we keep them mounted
    useEffect(() => {
        tabs.forEach(tab => {
            mountedTabsRef.current.add(tab.path);
        });
        
        // Clean up tracking for removed tabs
        mountedTabsRef.current.forEach(path => {
            if (!tabPaths.has(path)) {
                mountedTabsRef.current.delete(path);
            }
        });
    }, [tabs, tabPaths]);
    
    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {tabs.map((tab, index) => {
                const isActive = index === activeTabIndex;
                
                return (
                    <div
                        key={tab.id}
                        style={{
                            display: isActive ? 'block' : 'none',
                            height: '100%',
                            width: '100%',
                        }}
                    >
                        {/* Component stays mounted once created, just hidden/shown with CSS */}
                        <CachedTabContent 
                            path={tab.path}
                            outletContext={context}
                        />
                    </div>
                );
            })}
        </div>
    );
});

TabsContainer.displayName = 'TabsContainer';

export default TabsContainer;
