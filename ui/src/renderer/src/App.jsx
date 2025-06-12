import React, { Suspense } from 'react';
import { Outlet, Route, Routes, HashRouter } from 'react-router-dom';

const NoteEditor = React.lazy(() => import('./components/NoteEditor/NoteEditor.jsx'));
const Login = React.lazy(() => import('./components/Login/Login.jsx'));
const Documents = React.lazy(() => import('./components/Documents/Documents.jsx'));
const Register = React.lazy(() => import('./components/Register/Register.jsx'));
const Home = React.lazy(() => import('./components/Home/Home.jsx'));
const PrivateRoute = React.lazy(
    () => import('./components/PrivateRoute/PrivateRoute.jsx'),
);
const AuthProvider = React.lazy(
    () => import('./components/AuthProvider/AuthProvider.jsx'),
);
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
const Welcome = React.lazy(() => import('./components/Welcome/Welcome.jsx'));
const ActivityList = React.lazy(
    () => import('./components/ActivityList/ActivityList.jsx'),
);
const ConfirmEmail = React.lazy(
    () => import('./components/ConfirmEmail/ConfirmEmail.jsx'),
);
const ChangePassword = React.lazy(
    () => import('./components/ChangePassword/ChangePassword.jsx'),
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
const FleetingNoteEditor = React.lazy(
    () => import('./components/FleetingNoteEditor/FleetingNoteEditor.jsx'),
);
const ReportList = React.lazy(() => import('./components/ReportList/ReportList.jsx'));
const Connectivity = React.lazy(
    () => import('./components/Connectivity/Connectivity.jsx'),
);

import { useTheme } from './hooks/useTheme/useTheme';
import { ThemeProvider } from './contexts/ThemeContext/ThemeContext.jsx';
import { ModalProvider } from './contexts/ModalContext/ModalContext.jsx';
import CradleLoading from './components/CradleLoading/CradleLoading.jsx';

function App() {
    const { isDarkMode } = useTheme();

    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    return (
        <ThemeProvider>
            <ModalProvider>
                <HashRouter>
                    <Suspense fallback={<CradleLoading />}>
                        <AuthProvider>
                            <Routes>
                                <Route element={<PrivateRoute fallback={'/login'} />}>
                                    <Route path='/' element={<Home />}>
                                        <Route index element={<Welcome />} />
                                        <Route
                                            path='/not-implemented'
                                            element={<FeatureNotImplemented />}
                                        />
                                        <Route
                                            path='/documents'
                                            element={<Documents />}
                                        />
                                        <Route
                                            path='/editor/:id'
                                            element={<FleetingNoteEditor />}
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
                                            path='/notes/:id/edit'
                                            element={<NoteEditor />}
                                        />
                                        <Route
                                            path='/notes'
                                            element={<NoteSelector />}
                                        />
                                        <Route
                                            path='/knowledge-graph'
                                            element={<GraphExplorer />}
                                        />
                                        <Route
                                            path='/connectivity'
                                            element={<Connectivity />}
                                        />
                                        <Route
                                            path='/reports/:report_id'
                                            element={<ReportList />}
                                        />
                                        <Route path='/publish' element={<Publish />} />
                                        <Route
                                            path='/change-password'
                                            element={<ChangePassword />}
                                        />
                                        <Route
                                            path='/account/'
                                            element={<AccountSettings target='me' />}
                                        />
                                        <Route
                                            path='/activity'
                                            element={<ActivityList />}
                                        />
                                        <Route
                                            path='/activity/:username'
                                            element={<ActivityList />}
                                        />
                                        <Route path='/admin' element={<Outlet />}>
                                            <Route index element={<AdminPanel />} />
                                            <Route
                                                path='/admin/add/user'
                                                element={
                                                    <AccountSettings isEdit={false} />
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
                                <Route path='/register' element={<Register />} />
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
                        </AuthProvider>
                    </Suspense>
                </HashRouter>
            </ModalProvider>
        </ThemeProvider>
    );
}

export default App;
