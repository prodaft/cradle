import React, { Suspense } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

// Lazy-loaded route components
const Login = React.lazy(() => import('./components/domain/auth/Login'));
const Register = React.lazy(() => import('./components/domain/auth/Register'));
const OAuthCallback = React.lazy(
    () => import('./components/domain/auth/OAuthCallback'),
);
const ConfirmEmail = React.lazy(() => import('./components/domain/auth/ConfirmEmail'));
const ResetPassword = React.lazy(
    () => import('./components/domain/auth/ResetPassword'),
);
const ForgotPassword = React.lazy(
    () => import('./components/domain/auth/ForgotPassword'),
);
const MainLayout = React.lazy(
    () => import('./components/layout/MainLayout/MainLayout'),
);

const Documents = React.lazy(() => import('./components/domain/files/Documents'));
const Files = React.lazy(() => import('./components/domain/files/Files'));
const Welcome = React.lazy(() => import('./components/feedback/Welcome'));
const FeatureNotImplemented = React.lazy(
    () => import('./components/feedback/FeatureNotImplemented'),
);
const EntitiesPage = React.lazy(() => import('./components/domain/admin/pages/EntitiesPage'));
const EntryTypesPage = React.lazy(() => import('./components/domain/admin/pages/EntryTypesPage'));
const TypeMappingsPage = React.lazy(() => import('./components/domain/admin/pages/TypeMappingsPage'));
const UsersPage = React.lazy(() => import('./components/domain/admin/pages/UsersPage'));
const EnrichmentPage = React.lazy(() => import('./components/domain/admin/pages/EnrichmentPage'));
const ManagementPage = React.lazy(() => import('./components/domain/admin/pages/ManagementPage'));
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
const Reports = React.lazy(() => import('./components/domain/reports/Reports'));
const DigestData = React.lazy(() => import('./components/domain/activity/DigestData'));
const EnrichmentRequests = React.lazy(
    () => import('./components/domain/enrichment/EnrichmentRequests'),
);
const EnrichmentResults = React.lazy(
    () => import('./components/domain/enrichment/EnrichmentResults'),
);

// Feedback components
import NotFound from './components/feedback/NotFound';

// Auth components
import PrivateRoute from './components/domain/auth/PrivateRoute';

// Context providers
import { ProfileProvider } from '@/contexts';
import CradleLoading from './components/base/Loading/CradleLoading';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from './components/domain/auth/AuthProvider';
import { ApiProvider } from './contexts/api/ApiProvider';
import { RouteConfigProvider } from './contexts/routing/RouteConfigContext';
import { ModalProvider } from './contexts/ui/ModalContext';
import { ThemeProvider } from './contexts/ui/ThemeContext';
import { Toaster } from './components/ui/sonner';

function App() {
    return (
        <HashRouter>
            <AuthProvider>
                <ApiProvider>
                        <ProfileProvider>
                            <ThemeProvider>
                            <Toaster />
                                <TooltipProvider>
                                    <RouteConfigProvider>
                                        <ModalProvider>
                                            <Suspense
                                                fallback={<CradleLoading />}
                                            >
                                                <Routes>
                                                                <Route
                                                                    element={
                                                                        <PrivateRoute
                                                                            fallback={
                                                                                '/login'
                                                                            }
                                                                        />
                                                                    }
                                                                >
                                                                    <Route
                                                                        path='/'
                                                                        element={
                                                                            <MainLayout />
                                                                        }
                                                                    >
                                                                        <Route
                                                                            index
                                                                            element={
                                                                                <Welcome />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/not-implemented'
                                                                            element={
                                                                                <FeatureNotImplemented />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/notes'
                                                                            element={
                                                                                <Documents />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/files'
                                                                            element={
                                                                                <Files />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/digest-data'
                                                                            element={
                                                                                <DigestData />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/enrich'
                                                                            element={
                                                                                <EnrichmentRequests />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/enrichment/:id'
                                                                            element={
                                                                                <EnrichmentResults />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/dashboards/:subtype/:name'
                                                                            element={
                                                                                <Dashboard />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/notes/:id'
                                                                            element={
                                                                                <NoteViewer />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/knowledge-graph'
                                                                            element={
                                                                                <GraphExplorer
                                                                                    GraphSearchComponent={
                                                                                        GraphSearch
                                                                                    }
                                                                                />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/reports'
                                                                            element={
                                                                                <Reports />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/reports/:report_id'
                                                                            element={
                                                                                <ReportList />
                                                                            }
                                                                        />
                                                                        ,
                                                                        <Route
                                                                            path='/settings'
                                                                            element={
                                                                                <AccountSettings target='me' />
                                                                            }
                                                                        />
                                                                        <Route
                                                                            path='/manage'
                                                                            element={
                                                                                <Outlet />
                                                                            }
                                                                        >
                                                                            <Route
                                                                                index
                                                                                element={
                                                                                    <Navigate to="/manage/entities" replace />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='entities'
                                                                                element={
                                                                                    <EntitiesPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='entry-types'
                                                                                element={
                                                                                    <EntryTypesPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='type-mappings'
                                                                                element={
                                                                                    <TypeMappingsPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='users'
                                                                                element={
                                                                                    <UsersPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='enrichment'
                                                                                element={
                                                                                    <EnrichmentPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='management'
                                                                                element={
                                                                                    <ManagementPage />
                                                                                }
                                                                            />
                                                                            <Route
                                                                                path='add/user'
                                                                                element={
                                                                                    <AccountSettings
                                                                                        isEdit={
                                                                                            false
                                                                                        }
                                                                                    />
                                                                                }
                                                                            />
                                                                        </Route>
                                                                    </Route>
                                                                </Route>
                                                                <Route
                                                                    path='/login'
                                                                    element={<Login />}
                                                                />
                                                                <Route
                                                                    path='/oauth/callback'
                                                                    element={<OAuthCallback />}
                                                                />
                                                                <Route
                                                                    path='/confirm-email'
                                                                    element={
                                                                        <ConfirmEmail />
                                                                    }
                                                                />
                                                                <Route
                                                                    path='/reset-password'
                                                                    element={
                                                                        <ResetPassword />
                                                                    }
                                                                />
                                                                <Route
                                                                    path='/forgot-password'
                                                                    element={
                                                                        <ForgotPassword />
                                                                    }
                                                                />
                                                                <Route
                                                                    path='/register'
                                                                    element={
                                                                        <Register />
                                                                    }
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
                                    </RouteConfigProvider>
                                </TooltipProvider>
                            </ThemeProvider>
                        </ProfileProvider>
                </ApiProvider>
            </AuthProvider>
        </HashRouter>
    );
}

export default App;
