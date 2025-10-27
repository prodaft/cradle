import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import {
    AuthTokenException
} from '../../exceptions/AuthExceptions';
import { getBaseUrl } from '../../services/configService/configService';

/**
 * AuthContext - the context for authentication of the application
 * @type {React.Context<unknown>}
 */
export const AuthContext = createContext();

/**
 * Authentication result enum
 */
export const AuthResult = {
    SUCCESS: 'success',
    INVALID_CREDENTIALS: 'invalid_credentials',
    REQUIRES_2FA: 'requires_2fa',
    INACTIVE_ACCOUNT: 'inactive_account',
    UNCONFIRMED_EMAIL: 'unconfirmed_email',
    NETWORK_ERROR: 'network_error',
};

/**
 * AuthProvider component - provides authentication context to the application
 *
 * Manages JWT tokens internally without exposing them directly.
 * Automatically refreshes tokens before expiration.
 *
 * @function AuthProvider
 * @param {Array<React.ReactElement>} children - the children of the component
 * @returns {AuthProvider}
 * @constructor
 */
export default function AuthProvider({ children }) {
    const [role, setRole] = useState(localStorage.getItem('role') || '');
    const [userId, setUserId] = useState(localStorage.getItem('user_id') || null);
    const [isLoading, setIsLoading] = useState(false);

    // Store tokens and expiration in refs (not state) to avoid re-renders
    const accessTokenRef = useRef(localStorage.getItem('access_token') || '');
    const refreshTokenRef = useRef(localStorage.getItem('refresh_token') || '');
    const accessExpiresAtRef = useRef(localStorage.getItem('access_expires_at') || null);
    const refreshExpiresAtRef = useRef(localStorage.getItem('refresh_expires_at') || null);

    // Timer for automatic token refresh
    const refreshTimerRef = useRef(null);

    const basePath = getBaseUrl();

    /**
     * Check if user is currently logged in (has valid refresh token)
     */
    const isLoggedIn = useCallback(() => {
        if (!refreshTokenRef.current || !refreshExpiresAtRef.current) {
            return false;
        }

        const refreshExpiry = new Date(refreshExpiresAtRef.current);
        const now = new Date();

        // Check if refresh token is still valid
        return refreshExpiry > now;
    }, []);

    /**
     * Store tokens and metadata securely
     */
    const storeTokens = useCallback((data) => {
        accessTokenRef.current = data.access;
        refreshTokenRef.current = data.refresh;
        accessExpiresAtRef.current = data.access_expires_at;
        refreshExpiresAtRef.current = data.refresh_expires_at;

        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('access_expires_at', data.access_expires_at);
        localStorage.setItem('refresh_expires_at', data.refresh_expires_at);
        localStorage.setItem('role', data.role);

        setRole(data.role);

        // Extract user_id from access token if needed (optional, could be from backend)
        // For now, we'll just keep the existing user_id logic
    }, []);

    /**
     * Clear all stored tokens and user data
     */
    const clearTokens = useCallback(() => {
        accessTokenRef.current = '';
        refreshTokenRef.current = '';
        accessExpiresAtRef.current = null;
        refreshExpiresAtRef.current = null;

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access_expires_at');
        localStorage.removeItem('refresh_expires_at');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');

        setRole('');
        setUserId(null);

        // Clear refresh timer
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    /**
     * Refresh the access token using the refresh token
     * @returns {Promise<boolean>} true if refresh succeeded, false otherwise
     */
    const refreshAccessToken = useCallback(async () => {
        const refreshToken = refreshTokenRef.current;

        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${basePath}/users/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                storeTokens(data);
                return true;
            } else {
                // Refresh failed, clear tokens
                clearTokens();
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearTokens();
            return false;
        }
    }, [basePath, storeTokens, clearTokens]);

    /**
     * Schedule automatic token refresh before expiration
     */
    const scheduleTokenRefresh = useCallback(() => {
        // Clear existing timer
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        if (!accessExpiresAtRef.current) {
            return;
        }

        const expiresAt = new Date(accessExpiresAtRef.current);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();

        // Refresh 2 minutes before expiration (or immediately if already expired)
        const refreshIn = Math.max(0, timeUntilExpiry - 120000);

        refreshTimerRef.current = setTimeout(async () => {
            const success = await refreshAccessToken();
            if (success) {
                // Schedule next refresh
                scheduleTokenRefresh();
            }
        }, refreshIn);
    }, [refreshAccessToken]);

    /**
     * Get a valid access token, refreshing if necessary
     * @returns {Promise<string>} Valid access token
     * @throws {AuthTokenException} If unable to obtain valid token
     */
    const getAccessToken = useCallback(async () => {
        const accessToken = accessTokenRef.current;
        const accessExpiresAt = accessExpiresAtRef.current;

        if (!accessToken || !accessExpiresAt) {
            throw new AuthTokenException('No access token available');
        }

        const expiresAt = new Date(accessExpiresAt);
        const now = new Date();

        // If token expires in less than 60 seconds, refresh it
        if (expiresAt.getTime() - now.getTime() < 60000) {
            const success = await refreshAccessToken();
            if (!success) {
                throw new AuthTokenException('Failed to refresh access token');
            }
        }

        return accessTokenRef.current;
    }, [refreshAccessToken]);

    /**
     * Log in with username and password
     *
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} [twoFactorToken] - 2FA token if required
     * @returns {Promise<{result: string, message?: string}>}
     */
    const logIn = useCallback(
        async (username, password, twoFactorToken = null) => {
            setIsLoading(true);

            try {
                const body = { username, password };
                if (twoFactorToken) {
                    body.two_factor_token = twoFactorToken;
                }

                const response = await fetch(`${basePath}/users/login/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (response.ok) {
                    const data = await response.json();
                    storeTokens(data);

                    // Store user_id if available (you might need to decode or get from backend)
                    // For now assuming it's in the response or will be fetched separately
                    localStorage.setItem('user_id', data.user_id || '');
                    setUserId(data.user_id || null);

                    // Schedule automatic token refresh
                    scheduleTokenRefresh();

                    return { result: AuthResult.SUCCESS };
                } else {
                    const data = await response.json();

                    // Check for 2FA requirement
                    if (data.requires_2fa) {
                        return {
                            result: AuthResult.REQUIRES_2FA,
                            message: data.message || '2FA token required',
                        };
                    }

                    // Check for specific error messages
                    const errorMessage =
                        typeof data === 'string' ? data : data.error || data.detail || '';

                    if (errorMessage.includes('not confirmed')) {
                        return {
                            result: AuthResult.UNCONFIRMED_EMAIL,
                            message: errorMessage,
                        };
                    }

                    if (errorMessage.includes('not activated')) {
                        return {
                            result: AuthResult.INACTIVE_ACCOUNT,
                            message: errorMessage,
                        };
                    }

                    return {
                        result: AuthResult.INVALID_CREDENTIALS,
                        message: errorMessage || 'Invalid credentials',
                    };
                }
            } catch (error) {
                console.error('Login failed:', error);
                return {
                    result: AuthResult.NETWORK_ERROR,
                    message: 'Network error occurred',
                };
            } finally {
                setIsLoading(false);
            }
        },
        [basePath, storeTokens, scheduleTokenRefresh],
    );

    /**
     * Log out the current user
     */
    const logOut = useCallback(() => {
        clearTokens();
    }, [clearTokens]);

    /**
     * Internal method: Set tokens directly (for simulate session or testing)
     * @param {Object} data - Token data with access, refresh, role, access_expires_at, refresh_expires_at
     * @private
     */
    const setTokensDirectly = useCallback(
        (data) => {
            storeTokens(data);
            scheduleTokenRefresh();
        },
        [storeTokens, scheduleTokenRefresh],
    );

    // Role check helpers
    const isAdmin = useCallback(() => role === 'admin', [role]);
    const isEntryManager = useCallback(
        () => role === 'entrymanager' || role === 'admin',
        [role],
    );

    // Set up automatic token refresh on mount if logged in
    useEffect(() => {
        if (isLoggedIn()) {
            scheduleTokenRefresh();
        }

        // Cleanup on unmount
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [isLoggedIn, scheduleTokenRefresh]);

    return (
        <AuthContext.Provider
            value={{
                logIn,
                logOut,
                getAccessToken,
                isLoggedIn,
                role,
                userId,
                isAdmin,
                isEntryManager,
                isLoading,
                setTokensDirectly, // For admin simulate session feature
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
