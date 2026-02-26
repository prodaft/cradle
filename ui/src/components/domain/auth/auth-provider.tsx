import { parseAPIError } from '@/utils/api';
import { setClientAccessToken } from '@services/openapi/client';
import type { paths } from '@services/openapi/schema';
import createFetchClient from 'openapi-fetch';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AuthActionsContext,
    AuthStateContext,
    type AuthActionsValue,
    type AuthStateValue,
    type LoginResult,
    type TokenData,
} from './auth-context';
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

function setStorageItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // ignore storage failures (private mode, blocked storage, quota)
    }
}

function removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore storage failures (private mode, blocked storage, quota)
    }
}

function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

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

    const [isInitializing, setIsInitializing] = useState(true);
    const basePath = getBaseUrl();

    const fetchClient = useMemo(
        () => createFetchClient<paths>({ baseUrl: basePath, credentials: 'include' }),
        [basePath],
    );

    const accessTokenRef = useRef('');
    const accessExpiresAtRef = useRef<string | null>(
        getStorageItem('access_expires_at') || null,
    );
    const refreshExpiresAtRef = useRef<string | null>(
        getStorageItem('refresh_expires_at') || null,
    );

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
    const refreshAccessTokenRef = useRef<() => Promise<boolean>>(async () => false);

    const isLoggedIn = useCallback(() => {
        if (!refreshExpiresAtRef.current) {
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
            accessExpiresAtRef.current = data.accessExpiresAt.toISOString();
            refreshExpiresAtRef.current = data.refreshExpiresAt.toISOString();

            setClientAccessToken(data.access);

            setStorageItem('access_expires_at', data.accessExpiresAt.toISOString());
            setStorageItem('refresh_expires_at', data.refreshExpiresAt.toISOString());
            setStorageItem('role', data.role);

            setRole(data.role);
            scheduleTokenRefresh();
        },
        [scheduleTokenRefresh],
    );

    const clearTokens = useCallback(() => {
        accessTokenRef.current = '';
        accessExpiresAtRef.current = null;
        refreshExpiresAtRef.current = null;

        setClientAccessToken(null);

        removeStorageItem('access_expires_at');
        removeStorageItem('refresh_expires_at');
        removeStorageItem('role');
        removeStorageItem('user_id');

        setRole('');
        setUserId(null);

        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<boolean> => {
        if (refreshInFlightRef.current) {
            return refreshInFlightRef.current;
        }

        if (!isLoggedIn()) {
            clearTokens();
            throw new SessionExpiredException('No refresh token available');
        }

        refreshInFlightRef.current = (async () => {
            try {
                const { data, error, response } = await fetchClient.POST(
                    '/auth/refresh/',
                    {
                        body: {} as any,
                        headers: {
                            'X-CSRFToken': getCsrfToken() ?? '',
                        },
                    },
                );

                if (error || !data) {
                    if (response?.status === 401 || response?.status === 403) {
                        clearTokens();
                    }
                    return false;
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
            } catch {
                return false;
            } finally {
                refreshInFlightRef.current = null;
            }
        })();

        return refreshInFlightRef.current;
    }, [fetchClient, storeTokens, clearTokens, isLoggedIn]);

    const restoreSession = useCallback(async () => {
        if (!isLoggedIn()) {
            setIsInitializing(false);
            return;
        }
        try {
            const ok = await refreshAccessToken();
            if (!ok) {
                clearTokens();
            }
        } catch {
            clearTokens();
        } finally {
            setIsInitializing(false);
        }
    }, [clearTokens, isLoggedIn, refreshAccessToken]);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    useEffect(() => {
        refreshAccessTokenRef.current = refreshAccessToken;
    }, [refreshAccessToken]);

    const getAccessToken = useCallback(async (): Promise<string> => {
        const accessExpiresAt = accessExpiresAtRef.current;

        if (!accessTokenRef.current) {
            if (!isLoggedIn()) {
                throw new AuthTokenException('No access token available');
            }
            const ok = await refreshAccessToken();
            if (!ok || !accessTokenRef.current) {
                clearTokens();
                throw new SessionExpiredException('Unable to refresh access token');
            }
        }

        if (accessExpiresAt) {
            const expiresAt = new Date(accessExpiresAt);
            const now = new Date();

            if (expiresAt.getTime() - now.getTime() < 60000) {
                const ok = await refreshAccessToken();
                if (!ok || !accessTokenRef.current) {
                    clearTokens();
                    throw new SessionExpiredException('Unable to refresh access token');
                }
            }
        }

        if (!accessTokenRef.current) {
            throw new AuthTokenException('No access token available');
        }

        return accessTokenRef.current;
    }, [clearTokens, isLoggedIn, refreshAccessToken]);

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
                        headers: {
                            'X-CSRFToken': getCsrfToken() ?? '',
                        },
                    },
                );

                if (error || !data) {
                    const parsed = error
                        ? {
                              code: (error as any).code || 'UNKNOWN_ERROR',
                              detail: (error as any).detail || 'An error occurred',
                          }
                        : await parseAPIError({ response });
                    throw { ...parsed, status: response?.status };
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
                            setStorageItem('user_id', extractedUserId);
                            setUserId(extractedUserId);
                        }
                    }
                } catch {
                    // ignore malformed JWT payload
                }

                return { result: AuthResult.SUCCESS };
            } catch (error: any) {
                try {
                    const parsed =
                        error?.code != null
                            ? { ...error, detail: error.detail || 'An error occurred' }
                            : await parseAPIError(error);
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
                        parsed.code === 'invalid-two-factor-token' ||
                        parsed.detail?.toLowerCase?.().includes('invalid 2fa')
                    ) {
                        return {
                            result: AuthResult.INVALID_CREDENTIALS,
                            message: parsed.detail || 'Invalid 2FA code',
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

    const logOut = useCallback(async () => {
        try {
            await fetchClient.POST('/auth/logout/' as any, {
                headers: {
                    'X-CSRFToken': getCsrfToken() ?? '',
                },
            });
        } catch {
            // best-effort
        }
        clearTokens();
    }, [clearTokens, fetchClient]);

    const setTokensDirectly = useCallback(
        (data: TokenData) => {
            storeTokens(data);
            if (data.user_id !== undefined) {
                if (data.user_id) {
                    setStorageItem('user_id', data.user_id);
                } else {
                    removeStorageItem('user_id');
                }
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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onStorage = (event: StorageEvent) => {
            if (event.key === 'refresh_expires_at' && event.newValue === null) {
                clearTokens();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [clearTokens]);

    const stateValue = useMemo<AuthStateValue>(
        () => ({
            role,
            userId,
            isLoading,
            basePath,
            isAdmin,
            isEntryManager,
            isInitializing,
        }),
        [role, userId, isLoading, basePath, isAdmin, isEntryManager, isInitializing],
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
