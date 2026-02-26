import { parseAPIError } from '@/utils/api';
import type { paths } from '@services/openapi/schema';
import createFetchClient from 'openapi-fetch';
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

const getBaseUrl = (): string => {
    return import.meta.env.VITE_API_BASE_URL;
};

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

export interface AuthStateValue {
    role: string;
    userId: string | null;
    isLoading: boolean;
    basePath: string;
    isAdmin: boolean;
    isEntryManager: boolean;
}

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

export interface AuthContextValue extends AuthStateValue, AuthActionsValue {}

const AuthStateContext = createContext<AuthStateValue | undefined>(undefined);
const AuthActionsContext = createContext<AuthActionsValue | undefined>(undefined);

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

    const fetchClient = useMemo(
        () => createFetchClient<paths>({ baseUrl: basePath }),
        [basePath],
    );

    const accessTokenRef = useRef(getStorageItem('access_token') || '');
    const refreshTokenRef = useRef(getStorageItem('refresh_token') || '');
    const accessExpiresAtRef = useRef<string | null>(
        getStorageItem('access_expires_at') || null,
    );
    const refreshExpiresAtRef = useRef<string | null>(
        getStorageItem('refresh_expires_at') || null,
    );

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastNetworkErrorLogRef = useRef<number>(0);
    const refreshAccessTokenRef = useRef<() => Promise<boolean>>(async () => false);

    const isLoggedIn = useCallback(() => {
        if (!refreshTokenRef.current || !refreshExpiresAtRef.current) {
            return false;
        }
        const refreshExpiry = new Date(refreshExpiresAtRef.current);
        return refreshExpiry > new Date();
    }, []);

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

        const refreshIn = Math.max(0, timeUntilExpiry - 120000);

        refreshTimerRef.current = setTimeout(() => {
            void refreshAccessTokenRef.current();
        }, refreshIn);
    }, []);

    const storeTokens = useCallback(
        (data: TokenData) => {
            accessTokenRef.current = data.access;
            refreshTokenRef.current = data.refresh;
            accessExpiresAtRef.current = data.accessExpiresAt.toISOString();
            refreshExpiresAtRef.current = data.refreshExpiresAt.toISOString();

            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem(
                'access_expires_at',
                data.accessExpiresAt.toISOString(),
            );
            localStorage.setItem(
                'refresh_expires_at',
                data.refreshExpiresAt.toISOString(),
            );
            localStorage.setItem('role', data.role);

            setRole(data.role);
            scheduleTokenRefresh();
        },
        [scheduleTokenRefresh],
    );

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

        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<boolean> => {
        const refreshToken = refreshTokenRef.current;

        if (!refreshToken) {
            clearTokens();
            throw new SessionExpiredException('No refresh token available');
        }

        try {
            const { data, error, response } = await fetchClient.POST('/auth/refresh/', {
                body: { refresh: refreshToken },
            });

            if (error || !data) {
                throw { response };
            }

            const tokenData: TokenData = {
                access: data.access,
                refresh: data.refresh,
                accessExpiresAt: new Date(data.access_expires_at),
                refreshExpiresAt: new Date(data.refresh_expires_at),
                role: data.role,
            };

            storeTokens(tokenData);
            return true;
        } catch (error: any) {
            if (error instanceof SessionExpiredException) {
                throw error;
            }

            const now = Date.now();
            if (now - lastNetworkErrorLogRef.current > 5000) {
                lastNetworkErrorLogRef.current = now;
            }
            return false;
        }
    }, [fetchClient, storeTokens, clearTokens]);

    useEffect(() => {
        refreshAccessTokenRef.current = refreshAccessToken;
    }, [refreshAccessToken]);

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
            }
        }

        return accessTokenRef.current;
    }, [refreshAccessToken, clearTokens]);

    const logIn = useCallback(
        async (
            username: string,
            password: string,
            twoFactorToken: string | null = null,
        ): Promise<LoginResult> => {
            setIsLoading(true);

            try {
                const { data, error, response } = await fetchClient.POST(
                    '/auth/login/',
                    {
                        body: {
                            username,
                            password,
                            ...(twoFactorToken && { two_factor_token: twoFactorToken }),
                        },
                    },
                );

                if (error || !data) {
                    throw { response };
                }

                const tokenData: TokenData = {
                    access: data.access,
                    refresh: data.refresh,
                    accessExpiresAt: new Date(data.access_expires_at),
                    refreshExpiresAt: new Date(data.refresh_expires_at),
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
                } catch {
                    // ignore malformed JWT payload
                }

                return { result: AuthResult.SUCCESS };
            } catch (error: any) {
                try {
                    const parsed = await parseAPIError(error);
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
                } catch {
                    if (error && typeof error === 'object' && !error.response) {
                        return {
                            result: AuthResult.NETWORK_ERROR,
                            message: 'Network error occurred',
                        };
                    }

                    return {
                        result: AuthResult.INVALID_CREDENTIALS,
                        message: 'Invalid credentials',
                    };
                }
            } finally {
                setIsLoading(false);
            }
        },
        [fetchClient, storeTokens],
    );

    const logOut = useCallback(() => {
        clearTokens();
    }, [clearTokens]);

    const setTokensDirectly = useCallback(
        (data: TokenData) => {
            storeTokens(data);
            if (data.user_id !== undefined) {
                localStorage.setItem('user_id', data.user_id || '');
                setUserId(data.user_id || null);
            }
        },
        [storeTokens],
    );

    const isAdmin = role === 'admin';
    const isEntryManager = role === 'entrymanager' || role === 'admin';

    useEffect(() => {
        if (isLoggedIn()) {
            scheduleTokenRefresh();
        }

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [isLoggedIn, scheduleTokenRefresh]);

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
