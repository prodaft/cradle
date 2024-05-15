import TextEditor from './components/TextEditor/TextEditor.jsx';
import {Outlet, Route, Routes} from "react-router-dom";
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import Home from './components/Home/Home.jsx';
import { HashRouter as Router } from 'react-router-dom'
import PrivateRoute from "./utils/Auth/PrivateRoute.jsx";
import AuthProvider from "./utils/Auth/AuthProvider.jsx";
import FeatureNotImplemented from "./components/FeatureNotImplemented/FeatureNotImplemented";
import AdminPanel from "./components/AdminPanel/AdminPanel";
import AdminPanelAdd from "./components/AdminPanelAdd/AdminPanelAdd";

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
          <Route element={<PrivateRoute fallback={"/login"}/>}>
              {/* Add any routes for components that DO NOT NEED authentication here*/}
            <Route path="/" element={<Home/>}>
                {/* Add any routes for components that keep the sidebar and navbar here */}
                <Route path="/not-implemented" element={<FeatureNotImplemented/>} />
                <Route path="/editor" element={<TextEditor/>} />
                <Route path="/admin" element={<Outlet />}>
                    <Route index element={<AdminPanel/>}></Route>
                    <Route path="/admin/add-actor" element={<AdminPanelAdd type="Actor"/>}></Route>
                    <Route path="/admin/add-case" element={<AdminPanelAdd type="Case"/>}></Route>
                </Route>
            </Route>
              {/* Add any routes for components that DO NOT KEEP the sidebar and navbar here */}
          </Route>
            {/* Add any routes for components that DO NOT NEED authentication here*/}
          <Route path="/login" element={<Login />}></Route>
          <Route path="/register" element={<Register/>}></Route>
        </Routes>
      </AuthProvider>
    </Router>
  );

}

export default App
