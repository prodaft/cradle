import React, { Suspense } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';

// Lazy-loaded route components
const Login = React.lazy(() => import('./components/domain/auth/Login'));
const Register = React.lazy(() => import('./components/domain/auth/Register'));
const ConfirmEmail = React.lazy(() => import('./components/domain/auth/ConfirmEmail'));
const ResetPassword = React.lazy(() => import('./components/domain/auth/ResetPassword'));
const ForgotPassword = React.lazy(() => import('./components/domain/auth/ForgotPassword'));
const MainLayout = React.lazy(() => import('./components/layout/MainLayout/MainLayout'));

const Documents = React.lazy(() => import('./components/domain/files/Documents'));
const Files = React.lazy(() => import('./components/domain/files/Files'));
const Welcome = React.lazy(() => import('./components/feedback/Welcome'));
const FeatureNotImplemented = React.lazy(
    () => import('./components/feedback/FeatureNotImplemented'),
);
const AdminPanel = React.lazy(() => import('./components/domain/admin/AdminPanel'));
const AccountSettings = React.lazy(
    () => import('./components/domain/user/AccountSettings'),
);
const Dashboard = React.lazy(() => import('./components/domain/dashboard/Dashboard'));
const NoteViewer = React.lazy(() => import('./components/domain/notes/NoteViewer'));
const GraphSearch = React.lazy(() => import('./components/domain/graph/GraphSearch'));
const GraphExplorer = React.lazy(
    () => import('./components/domain/graph/GraphExplorer'),
);
const ReportList = React.lazy(() => import('./components/domain/reports/ReportList'));
const Reports = React.lazy(
    () => import('./components/domain/reports/Reports'),
);
const DigestData = React.lazy(() => import('./components/domain/activity/DigestData'));
const EnrichmentRequests = React.lazy(
    () => import('./components/domain/enrichment/EnrichmentRequests'),
);

// Feedback components
import CradleLoading from './components/base/Loading/CradleLoading';
import NotFound from './components/feedback/NotFound';

// Auth components
import PrivateRoute from './components/domain/auth/PrivateRoute';

// Layout components
import GlobalTabPortals from './components/layout/GlobalTabPortals/GlobalTabPortals';

// Context providers
import { ApiProvider } from './contexts/api/ApiProvider';
import { AuthProvider } from './components/domain/auth/AuthProvider';
import { LayoutProvider } from './contexts/ui/LayoutContext';
import { ModalProvider } from './contexts/ui/ModalContext';
import { NotificationProvider } from './contexts/ui/NotificationContext';
import { PaneTabsProvider } from './contexts/tabs/PaneTabsContext';
import { ProfileProvider } from './contexts/user/ProfileContext';
import { RouteConfigProvider } from './contexts/routing/RouteConfigContext';
import { TabHostProvider } from './contexts/tabs/TabHostContext';
import { ThemeProvider } from './contexts/ui/ThemeContext';
import { TooltipProvider } from './components/base/Tooltip/Tooltip';

function App() {
    return (
        <HashRouter>
            <AuthProvider>
                <ApiProvider>
                    <ProfileProvider>
                        <ThemeProvider>
                            <NotificationProvider>
                                <TooltipProvider>
                                    <RouteConfigProvider>
                                        <TabHostProvider>
                                            <LayoutProvider>
                                                <PaneTabsProvider>
                                                    <ModalProvider>
                                                        <Suspense fallback={<CradleLoading />}>
                                                        <GlobalTabPortals />
                                                        <Routes>
                                                            <Route
                                                                element={
                                                                    <PrivateRoute fallback={'/login'} />
                                                                }
                                                            >
                                                                <Route path='/' element={<MainLayout />}>
                                                                        <Route index element={<Welcome />} />
                                                                        <Route
                                                                            path='/not-implemented'
                                                                            element={<FeatureNotImplemented />}
                                                                        />
                                                                        <Route
                                                                            path='/notes'
                                                                            element={<Documents />}
                                                                        />
                                                                        <Route
                                                                            path='/files'
                                                                            element={<Files />}
                                                                        />
                                                                        <Route
                                                                            path='/digest-data'
                                                                            element={<DigestData />}
                                                                        />
                                                                        <Route
                                                                            path='/enrich'
                                                                            element={<EnrichmentRequests />}
                                                                        />
                                                                        <Route
                                                                            path='/dashboards/:subtype/:name'
                                                                            element={<Dashboard />}
                                                                        />
                                                                        <Route
                                                                            path='/notes/:id'
                                                                            element={<NoteViewer />}
                                                                        />
                                                                        <Route
                                                                            path='/knowledge-graph'
                                                                            element={<GraphExplorer GraphSearchComponent={GraphSearch} />}
                                                                        />
                                                                        <Route
                                                                            path='/reports'
                                                                            element={<Reports />}
                                                                        />
                                                                        <Route
                                                                            path='/reports/:report_id'
                                                                            element={<ReportList />}
                                                                        />
                                                                        <Route
                                                                            path='/settings'
                                                                            element={
                                                                                <AccountSettings target='me' />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/manage'
                                                                            element={<Outlet />}
                                                                        >
                                                                            <Route
                                                                                index
                                                                                element={<AdminPanel />}
                                                                            />
                                                                            <Route
                                                                                path='/manage/add/user'
                                                                                element={
                                                                                    <AccountSettings
                                                                                        isEdit={false}
                                                                                    />
                                                                                }
                                                                            />
                                                                        </Route>
                                                                </Route>
                                                            </Route>
                                                            <Route path='/login' element={<Login />} />
                                                            <Route
                                                                path='/confirm-email'
                                                                element={<ConfirmEmail />}
                                                            />
                                                            <Route
                                                                path='/reset-password'
                                                                element={<ResetPassword />}
                                                            />
                                                            <Route
                                                                path='/forgot-password'
                                                                element={<ForgotPassword />}
                                                            />
                                                            <Route
                                                                path='/register'
                                                                element={<Register />}
                                                            />
                                                            <Route
                                                                path='/not-found'
                                                                element={
                                                                    <NotFound
                                                                        message={
                                                                            "We can't seem to find the page you are looking for."
                                                                        }
                                                                    />
                                                                }
                                                            />
                                                        </Routes>
                                                        </Suspense>
                                                    </ModalProvider>
                                                </PaneTabsProvider>
                                            </LayoutProvider>
                                        </TabHostProvider>
                                    </RouteConfigProvider>
                                </TooltipProvider>
                            </NotificationProvider>
                        </ThemeProvider>
                    </ProfileProvider>
                </ApiProvider>
            </AuthProvider>
        </HashRouter>
    );
}

export default App;

