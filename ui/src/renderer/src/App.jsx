import React, { Suspense } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';

const Login = React.lazy(() => import('./components/Login/Login.jsx'));
const Documents = React.lazy(() => import('./components/Documents/Documents.jsx'));
const Files = React.lazy(() => import('./components/Files/Files.jsx'));
const Register = React.lazy(() => import('./components/Register/Register.jsx'));
const Welcome = React.lazy(() => import('./components/Welcome/Welcome.jsx'));
const MainLayout = React.lazy(() => import('./components/MainLayout/MainLayout.jsx'));

const FeatureNotImplemented = React.lazy(
    () => import('./components/FeatureNotImplemented/FeatureNotImplemented.jsx'),
);
const AdminPanel = React.lazy(() => import('./components/AdminPanel/AdminPanel.jsx'));
const AccountSettings = React.lazy(
    () => import('./components/AccountSettings/AccountSettings.jsx'),
);
const Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard.jsx'));
const NotFound = React.lazy(() => import('./components/NotFound/NotFound.jsx'));
const Publish = React.lazy(() => import('./components/Publish/Publish.jsx'));
const NoteViewer = React.lazy(() => import('./components/NoteViewer/NoteViewer.jsx'));
const NoteSelector = React.lazy(
    () => import('./components/NoteSelector/NoteSelector.jsx'),
);
const ActivityList = React.lazy(
    () => import('./components/ActivityList/ActivityList.jsx'),
);
const GraphSearch = React.lazy(() => import('./components/GraphQuery/GraphSearch.jsx'));
const ConfirmEmail = React.lazy(
    () => import('./components/ConfirmEmail/ConfirmEmail.jsx'),
);
const ResetPassword = React.lazy(
    () => import('./components/ResetPassword/ResetPassword.jsx'),
);
const ForgotPassword = React.lazy(
    () => import('./components/ForgotPassword/ForgotPassword.jsx'),
);
const GraphExplorer = React.lazy(
    () => import('./components/GraphExplorer/GraphExplorer.jsx'),
);
const ReportList = React.lazy(() => import('./components/ReportList/ReportList.jsx'));
const Reports = React.lazy(
    () => import('./components/Reports/Reports.jsx'),
);
const DigestData = React.lazy(() => import('./components/DigestData/DigestData.jsx'));
const EnrichmentRequests = React.lazy(
    () => import('./components/EnrichmentRequests/EnrichmentRequests.jsx'),
);

import ApiProvider from './components/ApiProvider/ApiProvider';
import AuthProvider from './components/AuthProvider/AuthProvider.jsx';
import CradleLoading from './components/CradleLoading/CradleLoading.jsx';
import PrivateRoute from './components/PrivateRoute/PrivateRoute.jsx';
import { TooltipProvider } from './components/Tooltip/Tooltip.jsx';
import { LayoutProvider } from './contexts/LayoutContext/LayoutContext.jsx';
import { ModalProvider } from './contexts/ModalContext/ModalContext.jsx';
import { PaneTabsProvider } from './contexts/PaneTabsContext/PaneTabsContext.jsx';
import { ProfileProvider } from './contexts/ProfileContext/ProfileContext.jsx';
import { RouteConfigProvider } from './contexts/RouteConfigContext/RouteConfigContext.jsx';
import { TabHostProvider } from './contexts/TabHostContext/TabHostContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext/ThemeContext.jsx';

function App() {
    return (
        <HashRouter>
            <AuthProvider>
                <ApiProvider>
                    <ProfileProvider>
                        <ThemeProvider>
                            <TooltipProvider>
                                <TabHostProvider>
                                    <RouteConfigProvider>
                                        <LayoutProvider>
                                            <PaneTabsProvider>
                                                <ModalProvider>
                                                    <Suspense fallback={<CradleLoading />}>
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
                                                                        path='/enrichment-requests'
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
                                                            <Route path='*' element={<NotFound />} />
                                                        </Routes>
                                                    </Suspense>
                                                </ModalProvider>
                                            </PaneTabsProvider>
                                        </LayoutProvider>
                                    </RouteConfigProvider>
                                </TabHostProvider>
                            </TooltipProvider>
                        </ThemeProvider>
                    </ProfileProvider>
                </ApiProvider>
            </AuthProvider>
        </HashRouter>
    );
}

export default App;
