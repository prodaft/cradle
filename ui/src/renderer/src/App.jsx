import React, { Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

// Lazy-loaded route components
const Login = React.lazy(() => import('./components/domain/auth/Login'));
const Register = React.lazy(() => import('./components/domain/auth/Register'));
const ConfirmEmail = React.lazy(() => import('./components/domain/auth/ConfirmEmail'));
const ResetPassword = React.lazy(() => import('./components/domain/auth/ResetPassword'));
const ForgotPassword = React.lazy(() => import('./components/domain/auth/ForgotPassword'));
const MainLayout = React.lazy(() => import('./components/layout/MainLayout/MainLayout'));
const NoteViewer = React.lazy(() => import('./components/domain/notes/NoteViewer.jsx'));

// Feedback components
import CradleLoading from './components/base/Loading/CradleLoading';
import NotFound from './components/feedback/NotFound';

// Auth components
import PrivateRoute from './components/domain/auth/PrivateRoute';

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
                                                                    <Route path='/notes/:id' element={<NoteViewer />} />
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
                            </NotificationProvider>
                        </ThemeProvider>
                    </ProfileProvider>
                </ApiProvider>
            </AuthProvider>
        </HashRouter>
    );
}

export default App;
