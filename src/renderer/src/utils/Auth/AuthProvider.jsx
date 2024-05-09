import { useContext, createContext, useState } from "react";
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [sessionid, setSessionid] = useState(localStorage.getItem("sessionid") || "");
  const [csrftoken, setCsrftoken] =  useState(localStorage.getItem("csrftoken") || "");

  const isAuthenticated = () => sessionid && csrftoken 
  const logIn = (session,csrf) => {
    setSessionid(session);
    localStorage.setItem("sessionid",session);
    setCsrftoken(csrf);
    localStorage.setItem("csrftoken",csrf);
  }
  const logOut = () => {
    setSessionid("");
    localStorage.removeItem("sessionid");
    setCsrftoken("");
    localStorage.removeItem("csrftoken")
  }

  return <AuthContext.Provider value={{sessionid,csrftoken,logIn,logOut,isAuthenticated}}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};