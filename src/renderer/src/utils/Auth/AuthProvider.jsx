import {createContext, useState} from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [access, setAccess] = useState(localStorage.getItem("access") || "");
  const [refresh, setRefresh] =  useState(localStorage.getItem("refresh") || "");

  const isAuthenticated = () => access && refresh 
  const logIn = (acc,ref) => {
    setAccess(acc);
    localStorage.setItem("access",acc);
    setRefresh(ref);
    localStorage.setItem("refresh",ref);
  }
  const logOut = () => {
    setAccess("");
    localStorage.removeItem("access");
    setRefresh("");
    localStorage.removeItem("refresh");
  }

  return <AuthContext.Provider value={{access,refresh,logIn,logOut,isAuthenticated}}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

