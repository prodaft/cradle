import TextEditor from './components/TextEditor/TextEditor.jsx';
import { Route, Routes } from "react-router-dom";
import Login from './components/Login/Login.jsx';
import Register from './components/Register/Register.jsx';
import Home from './components/Home/Home.jsx';
import { HashRouter as Router } from 'react-router-dom'
import PrivateRoute from "./utils/Auth/PrivateRoute.jsx";
import AuthProvider from "./utils/Auth/AuthProvider.jsx";

function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route element={<PrivateRoute fallback={"/login"}/>}>
            <Route path="/" element={<TextEditor />} />
          </Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/register" element={<Register/>}></Route>
        </Routes>
      </AuthProvider>
    </Router>
  );

}

export default App
