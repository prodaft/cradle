import { Outlet, Route, Routes, HashRouter } from 'react-router-dom';
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import Home from './components/Home/Home.jsx';
import PrivateRoute from './components/PrivateRoute/PrivateRoute.jsx';
import AuthProvider from './components/AuthProvider/AuthProvider.jsx';
import FeatureNotImplemented from './components/FeatureNotImplemented/FeatureNotImplemented';
import AdminPanel from './components/AdminPanel/AdminPanel';
import AccountSettings from './components/AccountSettings/AccountSettings';
import AdminPanelAdd from './components/AdminPanelAdd/AdminPanelAdd';
import AdminPanelEdit from './components/AdminPanelEdit/AdminPanelEdit';
import AdminPanelUserPermissions from './components/AdminPanelUserPermissions/AdminPanelUserPermissions';
import Dashboard from './components/Dashboard/Dashboard';
import NotFound from './components/NotFound/NotFound.jsx';
import PublishPreview from './components/PublishPreview/PublishPreview.jsx';
import NoteViewer from './components/NoteViewer/NoteViewer';
import TextEditor from './components/TextEditor/TextEditor';
import NoteEditor from './components/NoteEditor/NoteEditor.jsx';
import NoteSelector from './components/NoteSelector/NoteSelector.jsx';
import GraphComponent from './components/GraphComponent/GraphComponent';
import Welcome from './components/Welcome/Welcome.jsx';

/**
 * The App component is the artifact point of the application. It wraps the entire application in the AuthProvider
 * to handle authentication and authorization logic. The App component also defines the routes of the application.
 *
 * @function App
 * @returns {App}
 * @constructor
 */
function App() {
    return (
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
                            <Route path='/editor/:id' element={<TextEditor />} />
                            <Route path='/dashboards/*' element={<Dashboard />} />
                            <Route path='/notes/:id' element={<NoteViewer />} />
                            <Route path='/notes/:id/edit' element={<NoteEditor />} />
                            <Route path='/notes' element={<NoteSelector />} />
                            <Route
                                path='/knowledge-graph'
                                element={<GraphComponent />}
                            />
                            <Route path='/publish' element={<PublishPreview />}></Route>
                            <Route
                                path='/account'
                                element={<AccountSettings />}
                            ></Route>
                            <Route path='/admin' element={<Outlet />}>
                                <Route index element={<AdminPanel />}></Route>
                                <Route
                                    path='/admin/add-entity'
                                    element={<AdminPanelAdd type='Entity' />}
                                ></Route>
                                <Route
                                    path='/admin/add-artifact-type'
                                    element={<AdminPanelAdd type='ArtifactType' />}
                                ></Route>
                                <Route
                                    path='/admin/edit-entity/:id'
                                    element={<AdminPanelEdit type='Entity' />}
                                ></Route>
                                <Route
                                    path='/admin/edit-artifact-type/:id'
                                    element={<AdminPanelEdit type='ArtifactType' />}
                                ></Route>
                                <Route
                                    path={'/admin/user-permissions/:username/:id'}
                                    element={<AdminPanelUserPermissions />}
                                ></Route>
                            </Route>
                        </Route>
                        {/* Add any routes for components that DO NOT KEEP the sidebar and navbar here */}
                    </Route>
                    {/* Add any routes for components that DO NOT NEED authentication here */}
                    <Route path='/login' element={<Login />}></Route>
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
    );
}

export default App;
