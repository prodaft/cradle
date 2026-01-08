/**
 * Route Configuration Context
 * Provides centralized route configuration for the application
 */

import React, {
    ComponentType,
    createContext,
    LazyExoticComponent,
    ReactNode,
} from 'react';

// Import all route components
const Documents = React.lazy(() => import('@/components/domain/files/Documents.jsx'));
const Files = React.lazy(() => import('@/components/domain/files/Files.jsx'));
const FeatureNotImplemented = React.lazy(
    () => import('@/components/feedback/FeatureNotImplemented.jsx'),
);
const Dashboard = React.lazy(
    () => import('@/components/domain/dashboard/Dashboard.jsx'),
);
const NoteViewer = React.lazy(() => import('@/components/domain/notes/NoteViewer'));
const Welcome = React.lazy(() => import('@/components/feedback/Welcome.jsx'));
const ActivityList = React.lazy(
    () => import('@/components/domain/activity/ActivityList.jsx'),
);
const GraphSearch = React.lazy(
    () => import('@/components/domain/graph/GraphSearch.jsx'),
);
const GraphExplorer = React.lazy(
    () => import('@/components/domain/graph/GraphExplorer.jsx'),
);
const Reports = React.lazy(() => import('@/components/domain/reports/Reports.jsx'));
const ReportList = React.lazy(
    () => import('@/components/domain/reports/ReportList.jsx'),
);
const AccountSettings = React.lazy(
    () => import('@/components/domain/user/AccountSettings.jsx'),
);
const EntitiesPage = React.lazy(() => import('@/components/domain/admin/pages/EntitiesPage.jsx'));
const DigestData = React.lazy(
    () => import('@/components/domain/activity/DigestData.jsx'),
);
const EnrichmentRequests = React.lazy(
    () => import('@/components/domain/enrichment/EnrichmentRequests.jsx'),
);
const EnrichmentResults = React.lazy(
    () => import('@/components/domain/enrichment/EnrichmentResults.jsx'),
);

/**
 * Route configuration structure
 */
export interface RouteConfig {
    path: string;
    component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
    exact?: boolean;
}

/**
 * Define route configurations
 */
export const routeConfigs: RouteConfig[] = [
    { path: '/notes/:id', component: NoteViewer },
    { path: '/notes', component: Documents },
    { path: '/dashboards/:subtype/:name', component: Dashboard },
    { path: '/manage/add/user', component: () => <AccountSettings isEdit={false} /> },
    { path: '/manage', component: EntitiesPage },
    { path: '/reports/:report_id', component: ReportList },
    {
        path: '/knowledge-graph',
        component: () => <GraphExplorer GraphSearchComponent={GraphSearch} />,
    },
    { path: '/not-implemented', component: FeatureNotImplemented },
    { path: '/files', component: Files },
    { path: '/digest-data', component: DigestData },
    { path: '/reports', component: Reports },
    { path: '/activity/:username', component: ActivityList },
    { path: '/activity', component: ActivityList },
    { path: '/settings', component: () => <AccountSettings target='me' /> },
    { path: '/enrich', component: EnrichmentRequests },
    { path: '/enrichment/:id', component: EnrichmentResults },
    { path: '/', exact: true, component: Welcome },
];

export const RouteConfigContext = createContext<RouteConfig[]>(routeConfigs);

/**
 * Props for RouteConfigProvider component
 */
export interface RouteConfigProviderProps {
    children: ReactNode;
}

/**
 * RouteConfigProvider component
 * Provides route configurations to the application
 */
export function RouteConfigProvider({
    children,
}: RouteConfigProviderProps): JSX.Element {
    return (
        <RouteConfigContext.Provider value={routeConfigs}>
            {children}
        </RouteConfigContext.Provider>
    );
}
