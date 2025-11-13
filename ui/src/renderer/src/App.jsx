import React, { Suspense } from 'react';
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom';

const Login = React.lazy(() => import('./components/Login/Login.jsx'));
const Documents = React.lazy(() => import('./components/Documents/Documents.jsx'));
const Files = React.lazy(() => import('./components/Files/Files.jsx'));
const Register = React.lazy(() => import('./components/Register/Register.jsx'));
const MainLayout = React.lazy(() => import('./components/MainLayout/MainLayout.jsx'));

import ApiProvider from './components/ApiProvider/ApiProvider';
import AuthProvider from './components/AuthProvider/AuthProvider.jsx';
import CradleLoading from './components/CradleLoading/CradleLoading.jsx';
import PrivateRoute from './components/PrivateRoute/PrivateRoute.jsx';
import { TooltipProvider } from './components/Tooltip/Tooltip.jsx';
import { LayoutProvider } from './contexts/LayoutContext/LayoutContext.jsx';
import { ModalProvider } from './contexts/ModalContext/ModalContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext/NotificationContext.jsx';
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
                                                                <Route path='/*' element={<MainLayout />}/>
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
