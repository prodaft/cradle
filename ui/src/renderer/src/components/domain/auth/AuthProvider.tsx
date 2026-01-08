import {
    AuthTokenException,
    SessionExpiredException,
} from '@/exceptions/AuthExceptions';
import { getApiBaseUrl } from '@/utils/url';
import {
    createContext,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

/**
 * Get the base URL from localStorage or environment variable
 */
const getBaseUrl = (): string => {
    return localStorage.getItem('backendUrl') || import.meta.env.VITE_API_BASE_URL;
};

interface TokenData {
    access: string;
    refresh: string;
    accessExpiresAt: Date;
    refreshExpiresAt: Date;
    role: string;
    user_id?: string;
}

interface LoginResult {
    result: string;
    message?: string;
}

export interface AuthContextValue {
    logIn: (
        username: string,
        password: string,
        twoFactorToken?: string | null,
    ) => Promise<LoginResult>;
    logOut: () => void;
    getAccessToken: () => Promise<string>;
    isLoggedIn: () => boolean;
    role: string;
    userId: string | null;
    isAdmin: () => boolean;
    isEntryManager: () => boolean;
    isLoading: boolean;
    setTokensDirectly: (data: TokenData) => void;
    tokenVersion: number;
    basePath: string;
    setBasePath: (path: string) => void;
}

/**
 * AuthContext - the context for authentication of the application
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
} as const;

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider component - provides authentication context to the application
 *
 * Manages JWT tokens internally without exposing them directly.
 * Automatically refreshes tokens before expiration.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [role, setRole] = useState(localStorage.getItem('role') || '');
    const [userId, setUserId] = useState<string | null>(
        localStorage.getItem('user_id') || null,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [basePath, setBasePath] = useState(getBaseUrl());

    // Token version counter - increments when tokens change to trigger dependent re-renders
    const [tokenVersion, setTokenVersion] = useState(0);

    // Store tokens and expiration in refs (not state) to avoid re-renders
    const accessTokenRef = useRef(localStorage.getItem('access_token') || '');
    const refreshTokenRef = useRef(localStorage.getItem('refresh_token') || '');
    const accessExpiresAtRef = useRef<string | null>(
        localStorage.getItem('access_expires_at') || null,
    );
    const refreshExpiresAtRef = useRef<string | null>(
        localStorage.getItem('refresh_expires_at') || null,
    );

    // Timer for automatic token refresh
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Track last network error log time to throttle noisy error messages
    const lastNetworkErrorLogRef = useRef<number>(0);

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
    const storeTokens = useCallback((data: TokenData) => {
        accessTokenRef.current = data.access;
        refreshTokenRef.current = data.refresh;
        accessExpiresAtRef.current = data.accessExpiresAt.toISOString();
        refreshExpiresAtRef.current = data.refreshExpiresAt.toISOString();

        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('access_expires_at', data.accessExpiresAt.toISOString());
        localStorage.setItem('refresh_expires_at', data.refreshExpiresAt.toISOString());
        localStorage.setItem('role', data.role);

        setRole(data.role);
        setTokenVersion((prev) => prev + 1);
        scheduleTokenRefresh();
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

        // Increment token version to trigger re-renders in dependent components
        setTokenVersion((prev) => prev + 1);
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
     * @returns true if refresh succeeded
     * @throws {SessionExpiredException} if the server rejects the refresh token
     * Note: Returns false (does NOT throw) for network/connection errors
     */
    const refreshAccessToken = useCallback(async (): Promise<boolean> => {
        const refreshToken = refreshTokenRef.current;

        if (!refreshToken) {
            clearTokens();
            throw new SessionExpiredException('No refresh token available');
        }

        try {
            const response = await fetch(`${getApiBaseUrl(basePath)}/users/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                data.accessExpiresAt = new Date(data.access_expires_at);
                data.refreshExpiresAt = new Date(data.refresh_expires_at);
                storeTokens(data);
                scheduleTokenRefresh();
                return true;
            } else {
                // Server rejected the refresh token (expired, revoked, invalid)
                clearTokens();
                throw new SessionExpiredException();
            }
        } catch (error) {
            // Re-throw SessionExpiredException (from above or elsewhere)
            if (error instanceof SessionExpiredException) {
                throw error;
            }

            // Network/connection error - do NOT clear tokens, just return false
            // Throttle error logging to avoid console spam (log at most once per 5 seconds)
            const now = Date.now();
            if (now - lastNetworkErrorLogRef.current > 5000) {
                console.error('Token refresh failed due to network error:', error);
                lastNetworkErrorLogRef.current = now;
            }
            return false;
        }
    }, [basePath, storeTokens, clearTokens]);

    /**
     * Schedule automatic token refresh before expiration
     */
    const scheduleTokenRefresh = useCallback(() => {
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
            await refreshAccessToken();
        }, refreshIn);
    }, [refreshAccessToken]);

    /**
     * Get a valid access token, refreshing if necessary
     * @returns Valid access token
     * @throws {AuthTokenException} If no access token is available
     * @throws {SessionExpiredException} If the session has expired and refresh was rejected
     * Note: If refresh fails due to network error, returns the current token anyway
     */
    const getAccessToken = useCallback(async (): Promise<string> => {
        const accessToken = accessTokenRef.current;
        const accessExpiresAt = accessExpiresAtRef.current;

        if (!accessToken || !accessExpiresAt) {
            throw new AuthTokenException('No access token available');
        }

        const expiresAt = new Date(accessExpiresAt);
        const now = new Date();

        if (expiresAt.getTime() - now.getTime() < 60000) {
            try {
                await refreshAccessToken();
            } catch (error) {
                if (error instanceof SessionExpiredException) {
                    clearTokens();
                    throw error;
                }
                console.error('Unexpected error during token refresh:', error);
            }
        }

        return accessTokenRef.current;
    }, [refreshAccessToken]);

    /**
     * Log in with username and password
     */
    const logIn = useCallback(
        async (
            username: string,
            password: string,
            twoFactorToken: string | null = null,
        ): Promise<LoginResult> => {
            setIsLoading(true);

            try {
                const body: any = { username, password };
                if (twoFactorToken) {
                    body.two_factor_token = twoFactorToken;
                }

                const response = await fetch(`${getApiBaseUrl(basePath)}/users/login/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (response.ok) {
                    const data = await response.json();
                    data.accessExpiresAt = new Date(data.access_expires_at);
                    data.refreshExpiresAt = new Date(data.refresh_expires_at);
                    storeTokens(data);
                    localStorage.setItem('user_id', data.user_id || '');
                    setUserId(data.user_id || null);

                    return { result: AuthResult.SUCCESS };
                } else {
                    const data = await response.json();

                    if (
                        data.code === 'TWO_FACTOR_REQUIRED' ||
                        data.code === 'two-factor-required' ||
                        data.detail?.toLowerCase?.().includes('2fa token required')
                    ) {
                        return {
                            result: AuthResult.REQUIRES_2FA,
                            message: '',
                        };
                    }

                    if (
                        data.code === 'INVALID_TWO_FACTOR_TOKEN' ||
                        data.code === 'invalid-two-factor-token'
                    ) {
                        return {
                            result: AuthResult.INVALID_CREDENTIALS,
                            message: data.detail || data.message || 'Invalid 2FA token',
                        };
                    }

                    // Check for specific error messages
                    const errorMessage =
                        typeof data === 'string'
                            ? data
                            : data.error || data.detail || '';

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
     * @private
     */
    const setTokensDirectly = useCallback(
        (data: TokenData) => {
            storeTokens(data);
            if (data.user_id !== undefined) {
                localStorage.setItem('user_id', data.user_id || '');
                setUserId(data.user_id || null);
            }
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
                setTokensDirectly,
                tokenVersion,
                basePath,
                setBasePath,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export { AuthContext };
