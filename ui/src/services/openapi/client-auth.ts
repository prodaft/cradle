/**
 * JWT session + openapi-fetch auth hooks for `client.ts`.
 * Call `registerOpenapiAuthCallbacks()` from the client entry before `hydrateRoot` so route loaders
 * can authenticate; `AuthProvider` re-registers the same callbacks and syncs React (TanStack Start
 * does not prescribe a module name for this — it is app-specific wiring).
 */

import type { TokenData } from '@/components/domain/auth/auth-context';
import {
    AuthTokenException,
    SessionExpiredException,
} from '@/components/domain/auth/auth-exceptions';
import { resetSessionExpiredGate } from '@/query/query-client';
import type { ApiSchema } from './api-query';
import { fetchClient, setClientAccessToken, setClientAuthCallbacks } from './client';

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
        // ignore
    }
}

function removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    const raw = match?.[1];
    return raw === undefined ? null : decodeURIComponent(raw);
}

const state = {
    accessToken: '',
    accessExpiresAt: null as string | null,
    refreshExpiresAt: null as string | null,
    refreshToken: '' as string,
    refreshInFlight: null as Promise<boolean> | null,
    refreshTimer: null as ReturnType<typeof setTimeout> | null,
};

let roleListener: ((role: string) => void) | null = null;

export function setClientAuthRoleListener(fn: ((role: string) => void) | null) {
    roleListener = fn;
}

function scheduleTokenRefresh() {
    if (state.refreshTimer) {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = null;
    }
    if (!state.accessExpiresAt) {
        return;
    }
    const expiresAt = new Date(state.accessExpiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const refreshIn = Math.max(0, timeUntilExpiry - 120000);
    state.refreshTimer = setTimeout(() => {
        void refreshSessionAccessToken();
    }, refreshIn);
}

export function loadSessionFromStorage(): void {
    state.accessExpiresAt = getStorageItem('access_expires_at');
    state.refreshExpiresAt = getStorageItem('refresh_expires_at');
    state.accessToken = '';
}

export function isSessionLoggedIn(): boolean {
    if (!state.refreshExpiresAt) {
        return false;
    }
    return new Date(state.refreshExpiresAt) > new Date();
}

export function hasUsableAccessToken(): boolean {
    if (!state.accessToken || !state.accessExpiresAt) {
        return false;
    }
    return new Date(state.accessExpiresAt).getTime() - Date.now() >= 60_000;
}

export function clearClientSession(): void {
    state.accessToken = '';
    state.accessExpiresAt = null;
    state.refreshExpiresAt = null;
    state.refreshToken = '';
    setClientAccessToken(null);
    removeStorageItem('access_expires_at');
    removeStorageItem('refresh_expires_at');
    removeStorageItem('role');
    removeStorageItem('user_id');
    if (state.refreshTimer) {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = null;
    }
    roleListener?.('');
}

export function applyClientTokenData(data: TokenData): void {
    resetSessionExpiredGate();
    state.accessToken = data.access;
    state.accessExpiresAt = data.accessExpiresAt.toISOString();
    state.refreshExpiresAt = data.refreshExpiresAt.toISOString();
    state.refreshToken = data.refresh;
    setClientAccessToken(data.access);
    setStorageItem('access_expires_at', state.accessExpiresAt);
    setStorageItem('refresh_expires_at', state.refreshExpiresAt);
    setStorageItem('role', data.role);
    scheduleTokenRefresh();
    roleListener?.(data.role);
}

export async function refreshSessionAccessToken(): Promise<boolean> {
    if (state.refreshInFlight) {
        return state.refreshInFlight;
    }

    if (!isSessionLoggedIn()) {
        clearClientSession();
        return false;
    }

    state.refreshInFlight = (async () => {
        try {
            const { data, error, response } = await fetchClient.POST('/auth/refresh/', {
                body: {
                    refresh: state.refreshToken,
                } satisfies ApiSchema<'TokenRefreshRequest'>,
                headers: {
                    'X-CSRFToken': getCsrfToken() ?? '',
                },
            });

            if (error || !data) {
                if (response?.status === 401 || response?.status === 403) {
                    clearClientSession();
                }
                return false;
            }

            applyClientTokenData({
                access: data.access,
                refresh: data.refresh,
                accessExpiresAt: new Date(data.access_expires_at),
                refreshExpiresAt: new Date(data.refresh_expires_at),
                role: data.role,
            });
            return true;
        } catch {
            return false;
        } finally {
            state.refreshInFlight = null;
        }
    })();

    return state.refreshInFlight;
}

export async function getAccessTokenForRequest(): Promise<string> {
    if (!state.accessToken) {
        if (!isSessionLoggedIn()) {
            throw new AuthTokenException('No access token available');
        }
        const ok = await refreshSessionAccessToken();
        if (!ok || !state.accessToken) {
            clearClientSession();
            throw new SessionExpiredException('Unable to refresh access token');
        }
    }

    const accessExpiresAt = state.accessExpiresAt;
    if (accessExpiresAt) {
        const expiresAt = new Date(accessExpiresAt);
        if (expiresAt.getTime() - Date.now() < 60_000) {
            const ok = await refreshSessionAccessToken();
            if (!ok || !state.accessToken) {
                clearClientSession();
                throw new SessionExpiredException('Unable to refresh access token');
            }
        }
    }

    if (!state.accessToken) {
        throw new AuthTokenException('No access token available');
    }
    return state.accessToken;
}

export function registerOpenapiAuthCallbacks(): void {
    if (typeof window === 'undefined') return;
    loadSessionFromStorage();
    setClientAuthCallbacks(getAccessTokenForRequest, refreshSessionAccessToken);
}

export function unregisterOpenapiAuthCallbacks(): void {
    setClientAuthCallbacks(null, null);
}

export function syncRefreshTimerAfterInit(): void {
    if (isSessionLoggedIn() && state.accessExpiresAt) {
        scheduleTokenRefresh();
    }
}

export function clearRefreshTimer(): void {
    if (state.refreshTimer) {
        clearTimeout(state.refreshTimer);
        state.refreshTimer = null;
    }
}
