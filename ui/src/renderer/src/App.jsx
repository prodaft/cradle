import { Outlet, Route, Routes, HashRouter } from 'react-router-dom';
import Login from './components/Login/Login.jsx';
import Notes from './components/Notes/Notes.jsx';
import Register from './components/Register/Register.jsx';
import Home from './components/Home/Home.jsx';
import PrivateRoute from './components/PrivateRoute/PrivateRoute.jsx';
import AuthProvider from './components/AuthProvider/AuthProvider.jsx';
import FeatureNotImplemented from './components/FeatureNotImplemented/FeatureNotImplemented';
import AdminPanel from './components/AdminPanel/AdminPanel';
import AccountSettings from './components/AccountSettings/AccountSettings';
import Dashboard from './components/Dashboard/Dashboard';
import NotFound from './components/NotFound/NotFound.jsx';
import Publish from './components/Publish/Publish.jsx';
import NoteViewer from './components/NoteViewer/NoteViewer';
import TextEditor from './components/TextEditor/TextEditor';
import NoteEditor from './components/NoteEditor/NoteEditor.jsx';
import NoteSelector from './components/NoteSelector/NoteSelector.jsx';
import Welcome from './components/Welcome/Welcome.jsx';
import ActivityList from './components/ActivityList/ActivityList.jsx';
import ConfirmEmail from './components/ConfirmEmail/ConfirmEmail.jsx';
import ChangePassword from './components/ChangePassword/ChangePassword.jsx';
import ResetPassword from './components/ResetPassword/ResetPassword.jsx';
import ForgotPassword from './components/ForgotPassword/ForgotPassword.jsx';
import GraphExplorer from './components/GraphExplorer/GraphExplorer.jsx';
import FleetingNoteEditor from './components/FleetingNoteEditor/FleetingNoteEditor.jsx';
import UploadExternal from './components/UploadExternal/UploadExternal.jsx';
import { useTheme } from './hooks/useTheme/useTheme';
import { ThemeProvider } from './contexts/ThemeContext/ThemeContext.jsx';
import ReportList from './components/ReportList/ReportList.jsx';
import Connectivity from './components/Connectivity/Connectivity.jsx';

/**
 * The App component is the artifact point of the application. It wraps the entire application in the AuthProvider
 * to handle authentication and authorization logic. The App component also defines the routes of the application.
 *
 * @function App
 * @returns {App}
 * @constructor
 */
function App() {
    const { isDarkMode, toggleTheme } = useTheme();

    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    return (
        <ThemeProvider>
            <HashRouter>
                <AuthProvider>
                    <Routes>
                        <Route element={<PrivateRoute fallback={'/login'} />}>
                            {/* Add any routes for components that NEED authentication here */}
                            <Route path='/' element={<Home />}>
                                {/* Add any routes for components that keep the sidebar and navbar here */}
                                <Route index element={<Welcome />} />
                                <Route
                                    path='/not-implemented'
                                    element={<FeatureNotImplemented />}
                                />
                                <Route path='/notes' element={<Notes />}></Route>
                                <Route
                                    path='/editor/:id'
                                    element={<FleetingNoteEditor />}
                                />
                                <Route
                                    path='/dashboards/:subtype/:name'
                                    element={<Dashboard />}
                                />
                                <Route path='/notes/:id' element={<NoteViewer />} />
                                <Route
                                    path='/notes/:id/edit'
                                    element={<NoteEditor />}
                                />
                                <Route path='/notes' element={<NoteSelector />} />
                                <Route
                                    path='/knowledge-graph'
                                    element={<GraphExplorer />}
                                />
                                <Route
                                    path='/connectivity'
                                    element={<Connectivity />}
                                ></Route>
                                <Route
                                    path='/reports/:report_id'
                                    element={<ReportList />}
                                ></Route>
                                <Route path='/publish' element={<Publish />}></Route>
                                <Route
                                    path='/change-password'
                                    element={<ChangePassword />}
                                ></Route>
                                <Route
                                    path='/account/'
                                    element={<AccountSettings target='me' />}
                                ></Route>
                                <Route
                                    path='/activity'
                                    element={<ActivityList />}
                                ></Route>
                                <Route
                                    path='/activity/:username'
                                    element={<ActivityList />}
                                ></Route>
                                <Route path='/admin' element={<Outlet />}>
                                    <Route index element={<AdminPanel />}></Route>
                                    <Route
                                        path='/admin/add/user'
                                        element={<AccountSettings isEdit={false} />}
                                    ></Route>
                                </Route>
                            </Route>
                            {/* Add any routes for components that DO NOT KEEP the sidebar and navbar here */}
                        </Route>
                        {/* Add any routes for components that DO NOT NEED authentication here */}
                        <Route path='/login' element={<Login />}></Route>
                        <Route path='/confirm-email' element={<ConfirmEmail />}></Route>
                        <Route
                            path='/reset-password'
                            element={<ResetPassword />}
                        ></Route>
                        <Route
                            path='/forgot-password'
                            element={<ForgotPassword />}
                        ></Route>
                        <Route path='/register' element={<Register />}></Route>
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
            </HashRouter>
        </ThemeProvider>
    );
}

export default App;
