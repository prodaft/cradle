import { parseAPIError } from '@/utils/api';
import { setClientAuthCallbacks } from '@services/openapi/client';
import {
    applyClientTokenData,
    clearClientSession,
    clearRefreshTimer,
    getAccessTokenForRequest,
    hasUsableAccessToken,
    isSessionLoggedIn,
    refreshSessionAccessToken,
    setClientAuthRoleListener,
    syncRefreshTimerAfterInit,
    unregisterOpenapiAuthCallbacks,
} from '@services/openapi/client-auth';
import type { paths } from '@services/openapi/schema';
import createFetchClient from 'openapi-fetch';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    AuthActionsContext,
    AuthStateContext,
    type AuthActionsValue,
    type AuthStateValue,
    type LoginResult,
    type TokenData,
} from './auth-context';

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

const AuthResult = {
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

    const isLoggedIn = useCallback(() => isSessionLoggedIn(), []);

    const storeTokens = useCallback((data: TokenData) => {
        applyClientTokenData(data);
    }, []);

    const clearTokens = useCallback(() => {
        clearClientSession();
        setRole('');
        setUserId(null);
    }, []);

    const restoreSession = useCallback(async () => {
        if (!isSessionLoggedIn()) {
            setIsInitializing(false);
            return;
        }
        try {
            if (!hasUsableAccessToken()) {
                const ok = await refreshSessionAccessToken();
                if (!ok) {
                    clearTokens();
                }
            } else {
                syncRefreshTimerAfterInit();
            }
        } catch {
            clearTokens();
        } finally {
            setIsInitializing(false);
        }
    }, [clearTokens]);

    useEffect(() => {
        setClientAuthRoleListener(setRole);
        return () => setClientAuthRoleListener(null);
    }, []);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    useEffect(() => {
        if (!isInitializing && isSessionLoggedIn()) {
            syncRefreshTimerAfterInit();
        }
        return () => clearRefreshTimer();
    }, [isInitializing]);

    if (typeof window !== 'undefined') {
        setClientAuthCallbacks(getAccessTokenForRequest, refreshSessionAccessToken);
    }

    const getAccessToken = useCallback(() => getAccessTokenForRequest(), []);

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
                        ? await parseAPIError({ response, error })
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
                        parsed.detail?.toLowerCase?.().includes('2fa token required')
                    ) {
                        return {
                            result: AuthResult.REQUIRES_2FA,
                            message: '',
                        };
                    }

                    if (
                        parsed.code === 'INVALID_TWO_FACTOR_TOKEN' ||
                        parsed.detail?.toLowerCase?.().includes('invalid 2fa')
                    ) {
                        return {
                            result: AuthResult.INVALID_CREDENTIALS,
                            message: parsed.detail || 'Invalid 2FA code',
                            title: parsed.title,
                        };
                    }

                    const errorMessage = parsed.detail || '';

                    if (parsed.code === 'EMAIL_NOT_CONFIRMED') {
                        return {
                            result: AuthResult.UNCONFIRMED_EMAIL,
                            message: errorMessage,
                            title: parsed.title,
                        };
                    }

                    if (parsed.code === 'ACCOUNT_NOT_ACTIVATED') {
                        return {
                            result: AuthResult.INACTIVE_ACCOUNT,
                            message: errorMessage,
                            title: parsed.title,
                        };
                    }

                    return {
                        result: AuthResult.INVALID_CREDENTIALS,
                        message: errorMessage || 'Invalid credentials',
                        title: parsed.title,
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
        return () => unregisterOpenapiAuthCallbacks();
    }, []);

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
