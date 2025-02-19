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
    const [role, setRole] = useState(localStorage.getItem('role') || 'user');

    const [userId, setUserId] = useState(localStorage.getItem('user_id') || null);

    const isAdmin = () => role === 'admin';
    const isEntryManager = () => role === 'entrymanager' || isAdmin();

    const isAuthenticated = () => access !== '';
    const logIn = (acc, ref) => {
        setAccess(acc);
        localStorage.setItem('access', acc);
        setRefresh(ref);
        localStorage.setItem('refresh', ref);

        try {
            const { user_id, exp, role } = jwtDecode(acc);
            setExpiration(exp);
            setRole(role);
            setUserId(user_id);
            localStorage.setItem('expiration', exp.toString());
            localStorage.setItem('role', role);
            localStorage.setItem('user_id', user_id);
        } catch (e) {
            setRole('user');
            localStorage.setItem('role', 'user');
        }
    };
    const logOut = () => {
        setAccess('');
        localStorage.removeItem('access');
        setRefresh('');
        localStorage.removeItem('refresh');
        setRole('user');
        localStorage.removeItem('role');
        setRole(null);
        localStorage.removeItem('user_id');
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
                userId,
                isEntryManager,
                role,
                logIn,
                logOut,
                isAuthenticated,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
