import TextEditor from './components/TextEditor/TextEditor.jsx';
import { Outlet, Route, Routes } from "react-router-dom";
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import Home from './components/Home/Home.jsx';
import { HashRouter as Router } from 'react-router-dom'
import PrivateRoute from "./utils/PrivateRoute/PrivateRoute.jsx";
import AuthProvider from "./utils/AuthProvider/AuthProvider.jsx";
import FeatureNotImplemented from "./components/FeatureNotImplemented/FeatureNotImplemented";
import AdminPanel from "./components/AdminPanel/AdminPanel";
import AdminPanelAdd from "./components/AdminPanelAdd/AdminPanelAdd";
import AdminPanelUserPermissions from "./components/AdminPanelUserPermissions/AdminPanelUserPermissions";
import Dashboard from "./components/Dashboard/Dashboard";
import NotFound from './components/NotFound/NotFound.jsx';
import NoteViewer from "./components/NoteViewer/NoteViewer";

/**
 * The App component is the entry point of the application. It wraps the entire application in the AuthProvider
 * to handle authentication and authorization logic. The App component also defines the routes of the application.
 *
 * @returns App
 */
function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<PrivateRoute fallback={"/login"} />}>
            {/* Add any routes for components that NEED authentication here*/}
                 <Route path="/" element={<Home />}>
              {/* Add any routes for components that keep the sidebar and navbar here */}
                    <Route path="/not-implemented" element={<FeatureNotImplemented />} />
                    <Route path="/editor" element={<TextEditor />} />
                    <Route path="/dashboards/*" element={<Dashboard/>} />
                     <Route path="/notes/:id" element={<NoteViewer />} />
                    <Route path="/admin" element={<Outlet />}>
                        <Route index element={<AdminPanel />}></Route>
                        <Route path="/admin/add-actor" element={<AdminPanelAdd type="Actor" />}></Route>
                        <Route path="/admin/add-case" element={<AdminPanelAdd type="Case" />}></Route>
                        <Route path={"/admin/user-permissions/:username/:id"} element={<AdminPanelUserPermissions />}></Route>
                    </Route>
                </Route>
            {/* Add any routes for components that DO NOT KEEP the sidebar and navbar here */}
          </Route>
          {/* Add any routes for components that DO NOT NEED authentication here*/}
          <Route path="/login" element={<Login />}></Route>
          <Route path="/register" element={<Register />}></Route>
          <Route path="/not-found" element={<NotFound message={"We can't seem to find the page you are looking for."} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );

}

export default App
