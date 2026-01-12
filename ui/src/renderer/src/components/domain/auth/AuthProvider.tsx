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

// State interface - values that change and cause rerenders
export interface AuthStateValue {
    role: string;
    userId: string | null;
    isLoading: boolean;
    basePath: string;
}

// Actions interface - functions that don't change
export interface AuthActionsValue {
    logIn: (
        username: string,
        password: string,
        twoFactorToken?: string | null,
    ) => Promise<LoginResult>;
    logOut: () => void;
    getAccessToken: () => Promise<string>;
    isLoggedIn: () => boolean;
    isAdmin: () => boolean;
    isEntryManager: () => boolean;
    setTokensDirectly: (data: TokenData) => void;
    setBasePath: (path: string) => void;
}

// Combined interface kept for type compatibility (useAuth removed)
export interface AuthContextValue extends AuthStateValue, AuthActionsValue {}

/**
 * AuthStateContext - provides authentication state (role, userId, isLoading, basePath)
 * Components that only need state should use useAuthState() to avoid rerenders from action changes
 */
const AuthStateContext = createContext<AuthStateValue | undefined>(undefined);

/**
 * AuthActionsContext - provides authentication actions (logIn, logOut, getAccessToken, etc.)
 * Components that only need actions should use useAuthActions() to avoid rerenders from state changes
 */
const AuthActionsContext = createContext<AuthActionsValue | undefined>(undefined);

// AuthContext removed - use AuthStateContext and AuthActionsContext instead

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
    const [basePath, setBasePathState] = useState(getBaseUrl());

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
                // Network errors are throttled to avoid spam
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
                // Unexpected error during token refresh - already handled above
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

                const response = await fetch(
                    `${getApiBaseUrl(basePath)}/users/login/`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(body),
                    },
                );

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

    /**
     * Set base path and update localStorage
     */
    const setBasePath = useCallback((path: string) => {
        localStorage.setItem('backendUrl', path);
        setBasePathState(path);
    }, []);

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

    // State value - only changes when role, userId, isLoading, or basePath change
    const stateValue: AuthStateValue = {
        role,
        userId,
        isLoading,
        basePath,
    };

    // Actions value - stable references, doesn't cause rerenders
    const actionsValue: AuthActionsValue = {
        logIn,
        logOut,
        getAccessToken,
        isLoggedIn,
        isAdmin,
        isEntryManager,
        setTokensDirectly,
        setBasePath,
    };

    return (
        <AuthStateContext.Provider value={stateValue}>
            <AuthActionsContext.Provider value={actionsValue}>
                {children}
            </AuthActionsContext.Provider>
        </AuthStateContext.Provider>
    );
}

export { AuthActionsContext, AuthStateContext };
