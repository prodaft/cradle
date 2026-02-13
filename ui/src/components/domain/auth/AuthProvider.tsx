import { AuthApi } from '@/services/cradle';
import { parseAPIError } from '@/utils/api';
import {
    TokenObtainRequest,
    TokenPairRetrieve,
    TokenRefreshRetrieve,
} from '@services/cradle/models';
import { Configuration } from '@services/cradle/runtime';
import {
    createContext,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AuthTokenException, SessionExpiredException } from './auth-exceptions';

/**
 * Get the base URL from environment variable
 */
const getBaseUrl = (): string => {
    return import.meta.env.VITE_API_BASE_URL;
};

/** SSR-safe: returns null when localStorage is not available (e.g. during server render). */
function getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

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
    isAdmin: boolean;
    isEntryManager: boolean;
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
    setTokensDirectly: (data: TokenData) => void;
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
    const [role, setRole] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const storedRole = getStorageItem('role');
        const storedUserId = getStorageItem('user_id');
        if (storedRole) setRole(storedRole);
        if (storedUserId) setUserId(storedUserId);
    }, []);
    const basePath = getBaseUrl();

    const authApi = useMemo(() => {
        const config = new Configuration({
            basePath: basePath,
        });
        return new AuthApi(config);
    }, [basePath]);

    // Store tokens and expiration in refs (not state) to avoid re-renders
    const accessTokenRef = useRef(getStorageItem('access_token') || '');
    const refreshTokenRef = useRef(getStorageItem('refresh_token') || '');
    const accessExpiresAtRef = useRef<string | null>(
        getStorageItem('access_expires_at') || null,
    );
    const refreshExpiresAtRef = useRef<string | null>(
        getStorageItem('refresh_expires_at') || null,
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
            const data: TokenRefreshRetrieve = await authApi.authRefreshCreate({
                tokenRefreshRequest: { refresh: refreshToken },
            });

            const tokenData: TokenData = {
                access: data.access,
                refresh: data.refresh,
                accessExpiresAt: data.accessExpiresAt,
                refreshExpiresAt: data.refreshExpiresAt,
                role: data.role,
            };

            storeTokens(tokenData);
            scheduleTokenRefresh();
            return true;
        } catch (error: any) {
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
    }, [authApi, storeTokens, clearTokens]);

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
                const tokenRequest: TokenObtainRequest = {
                    username,
                    password,
                    ...(twoFactorToken && { twoFactorToken }),
                };

                const data: TokenPairRetrieve = await authApi.authLoginCreate({
                    tokenObtainRequest: tokenRequest,
                });

                const tokenData: TokenData = {
                    access: data.access,
                    refresh: data.refresh,
                    accessExpiresAt: data.accessExpiresAt,
                    refreshExpiresAt: data.refreshExpiresAt,
                    role: data.role,
                };

                storeTokens(tokenData);

                try {
                    const tokenParts = data.access.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(
                            atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')),
                        );
                        const extractedUserId = payload.user_id || payload.sub || null;
                        if (extractedUserId) {
                            localStorage.setItem('user_id', extractedUserId);
                            setUserId(extractedUserId);
                        }
                    }
                } catch (e) {}

                return { result: AuthResult.SUCCESS };
            } catch (error: any) {
                try {
                    const parsed = await parseAPIError(error);
                    const errorData = parsed.raw;

                    if (
                        parsed.code === 'TWO_FACTOR_REQUIRED' ||
                        parsed.code === 'two-factor-required' ||
                        parsed.detail?.toLowerCase?.().includes('2fa token required')
                    ) {
                        return {
                            result: AuthResult.REQUIRES_2FA,
                            message: '',
                        };
                    }

                    if (
                        parsed.code === 'INVALID_TWO_FACTOR_TOKEN' ||
                        parsed.code === 'invalid-two-factor-token'
                    ) {
                        return {
                            result: AuthResult.INVALID_CREDENTIALS,
                            message: parsed.detail || 'Invalid 2FA token',
                        };
                    }

                    // Check for specific error messages
                    const errorMessage = parsed.detail || '';

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
                } catch (parseError) {
                    // If we can't parse the error, check for network error
                    if (error && typeof error === 'object' && !error.response) {
                        return {
                            result: AuthResult.NETWORK_ERROR,
                            message: 'Network error occurred',
                        };
                    }

                    // Generic error
                    return {
                        result: AuthResult.INVALID_CREDENTIALS,
                        message: 'Invalid credentials',
                    };
                }
            } finally {
                setIsLoading(false);
            }
        },
        [authApi, storeTokens],
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

    // Role check helpers - computed from state
    const isAdmin = role === 'admin';
    const isEntryManager = role === 'entrymanager' || role === 'admin';

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

    // State value - memoized to prevent unnecessary rerenders
    const stateValue = useMemo<AuthStateValue>(
        () => ({
            role,
            userId,
            isLoading,
            basePath,
            isAdmin,
            isEntryManager,
        }),
        [role, userId, isLoading, basePath, isAdmin, isEntryManager],
    );

    // Actions value - memoized with stable function references
    const actionsValue = useMemo<AuthActionsValue>(
        () => ({
            logIn,
            logOut,
            getAccessToken,
            isLoggedIn,
            setTokensDirectly,
        }),
        [logIn, logOut, getAccessToken, isLoggedIn, setTokensDirectly],
    );

    return (
        <AuthStateContext.Provider value={stateValue}>
            <AuthActionsContext.Provider value={actionsValue}>
                {children}
            </AuthActionsContext.Provider>
        </AuthStateContext.Provider>
    );
}

export { AuthActionsContext, AuthStateContext };
