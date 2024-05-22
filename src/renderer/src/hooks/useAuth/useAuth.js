import {useContext} from "react";
import {AuthContext} from "../../utils/AuthProvider/AuthProvider";

/**
 * Hook to use the AuthContext
 * Provides access to global context for authentication
 * Must be used inside a component wrapped in AuthProvider
 * @returns {*}
 */
export const useAuth = () => {
    return useContext(AuthContext);
};