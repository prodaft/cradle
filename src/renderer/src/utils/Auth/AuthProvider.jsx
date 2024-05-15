import {createContext, useState} from "react";

/**
 * AuthContext - the context for the authentication of the application
 * @type {React.Context<unknown>}
 */
export const AuthContext = createContext();

/**
 * AuthProvider component - provides authentication context to the application
 * Wraps the application in the context provider
 * The context provides the access token, refresh token, and functions for logging in and out
 * The context also provides a function to check if the user is authenticated
 * The context is stored in local storage for persistence
 * This should be used only once to wrap the application in the App.jsx file
 * @param children - the children of the component
 * @returns {JSX.Element}
 * @constructor
 */
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

