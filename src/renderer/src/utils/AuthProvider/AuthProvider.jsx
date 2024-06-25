import { createContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

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
 * 
 * @function AuthProvider
 * @param {Array<React.ReactElement>} children - the children of the component
 * @returns {AuthProvider}
 * @constructor
 */
export default function AuthProvider({ children }) {
    const [access, setAccess] = useState(localStorage.getItem('access') || '');
    const [refresh, setRefresh] = useState(localStorage.getItem('refresh') || '');
    const [expiration, setExpiration] = useState(
        localStorage.getItem('expiration') || '0',
    );
    const [isAdmin, setIsAdmin] = useState(
        localStorage.getItem('isAdmin') === 'true' || false,
    );

    const isAuthenticated = () => access !== '';
    const logIn = (acc, ref) => {
        setAccess(acc);
        localStorage.setItem('access', acc);
        setRefresh(ref);
        localStorage.setItem('refresh', ref);

        try {
            const { exp, is_admin } = jwtDecode(acc);
            setExpiration(exp);
            setIsAdmin(is_admin);
            localStorage.setItem('expiration', exp.toString());
            localStorage.setItem('isAdmin', is_admin.toString());
        } catch (e) {
            setIsAdmin(false);
            localStorage.setItem('isAdmin', 'false');
        }
    };
    const logOut = () => {
        setAccess('');
        localStorage.removeItem('access');
        setRefresh('');
        localStorage.removeItem('refresh');
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
        setExpiration('0');
        localStorage.removeItem('expiration');
    };

    return (
        <AuthContext.Provider
            value={{
                access,
                refresh,
                expiration,
                isAdmin,
                logIn,
                logOut,
                isAuthenticated,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
