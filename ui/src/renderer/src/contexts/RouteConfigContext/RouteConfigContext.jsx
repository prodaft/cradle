import React, { createContext, useContext } from 'react';

// Import all route components
const Documents = React.lazy(() => import('../../components/Documents/Documents.jsx'));
const Files = React.lazy(() => import('../../components/Files/Files.jsx'));
const FeatureNotImplemented = React.lazy(() => import('../../components/FeatureNotImplemented/FeatureNotImplemented.jsx'));
const Dashboard = React.lazy(() => import('../../components/Dashboard/Dashboard.jsx'));
const NoteViewer = React.lazy(() => import('../../components/NoteViewer/NoteViewer.jsx'));
const NoteSelector = React.lazy(() => import('../../components/NoteSelector/NoteSelector.jsx'));
const Welcome = React.lazy(() => import('../../components/Welcome/Welcome.jsx'));
const ActivityList = React.lazy(() => import('../../components/ActivityList/ActivityList.jsx'));
const GraphSearch = React.lazy(() => import('../../components/GraphQuery/GraphSearch.jsx'));
const GraphExplorer = React.lazy(() => import('../../components/GraphExplorer/GraphExplorer.jsx'));
const Reports = React.lazy(() => import('../../components/Reports/Reports.jsx'));
const ReportList = React.lazy(() => import('../../components/ReportList/ReportList.jsx'));
const Publish = React.lazy(() => import('../../components/Publish/Publish.jsx'));
const AccountSettings = React.lazy(() => import('../../components/AccountSettings/AccountSettings.jsx'));
const AdminPanel = React.lazy(() => import('../../components/AdminPanel/AdminPanel.jsx'));
const DigestData = React.lazy(() => import('../../components/DigestData/DigestData.jsx'));
const EnrichmentRequests = React.lazy(() => import('../../components/EnrichmentRequests/EnrichmentRequests.jsx'));

/**
 * Define route configurations
 */
const routeConfigs = [
  { path: '/notes/:id', component: NoteViewer },
  { path: '/notes', component: Documents },
  { path: '/dashboards/:subtype/:name', component: Dashboard },
  { path: '/manage/add/user', component: () => <AccountSettings isEdit={false} /> },
  { path: '/manage', component: AdminPanel },
  { path: '/reports/:report_id', component: ReportList },
  { path: '/knowledge-graph', component: () => <GraphExplorer GraphSearchComponent={GraphSearch} /> },
  { path: '/not-implemented', component: FeatureNotImplemented },
  { path: '/files', component: Files },
  { path: '/digest-data', component: DigestData },
  { path: '/reports', component: Reports },
  { path: '/publish', component: Publish },
  { path: '/activity/:username', component: ActivityList },
  { path: '/activity', component: ActivityList },
  { path: '/settings', component: () => <AccountSettings target='me' /> },
  { path: '/enrich', component: EnrichmentRequests },
  { path: '/', exact: true, component: Welcome },
];

const RouteConfigContext = createContext(routeConfigs);

export const useRouteConfigs = () => {
  const context = useContext(RouteConfigContext);
  if (!context) {
    throw new Error('useRouteConfigs must be used within RouteConfigProvider');
  }
  return context;
};

export function RouteConfigProvider({ children }) {
  return (
    <RouteConfigContext.Provider value={routeConfigs}>
      {children}
    </RouteConfigContext.Provider>
  );
}
