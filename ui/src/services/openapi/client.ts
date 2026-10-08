import { SessionExpiredException } from '@services/openapi/auth-exceptions';
import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './schema';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const AUTH_PATHS = [
    '/auth/login',
    '/auth/oauth/login',
    '/auth/refresh',
    '/auth/logout',
    '/auth/reset-password',
    '/auth/email-confirm',
    '/auth/signup',
    '/auth/config',
];

function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    const raw = match?.[1];
    return raw === undefined ? null : decodeURIComponent(raw);
}

type EnsureSessionFn = () => Promise<void>;
type RefreshSessionFn = () => Promise<boolean>;

let _ensureSession: EnsureSessionFn | null = null;
let _refreshSession: RefreshSessionFn | null = null;

/**
 * Auth tokens live only in HttpOnly cookies; these callbacks keep the cookie session
 * fresh (refresh before expiry, and once more after a 401).
 */
export function setClientAuthCallbacks(
    ensureSession: EnsureSessionFn | null,
    refreshSession: RefreshSessionFn | null,
) {
    _ensureSession = ensureSession;
    _refreshSession = refreshSession;
}

export async function ensureClientSession(): Promise<boolean> {
    if (!_ensureSession) return false;
    try {
        await _ensureSession();
        return true;
    } catch {
        return false;
    }
}

function isAuthPath(url: string): boolean {
    try {
        const path = new URL(url, baseUrl).pathname;
        return AUTH_PATHS.some((p) => path.includes(p));
    } catch {
        return false;
    }
}

export const fetchClient = createFetchClient<paths>({
    baseUrl,
    credentials: 'include',
});

fetchClient.use({
    onRequest: async ({ request }) => {
        const headers = new Headers(request.headers);

        if (!isAuthPath(request.url) && _ensureSession) {
            try {
                await _ensureSession();
            } catch {
                throw new SessionExpiredException('Unable to renew session');
            }
        }

        const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (unsafeMethods.includes(request.method.toUpperCase())) {
            const csrf = getCsrfToken();
            if (csrf) {
                headers.set('X-CSRFToken', csrf);
            }
        }

        return new Request(request, { headers });
    },
});

fetchClient.use({
    onResponse: async ({ request, response }) => {
        if (response.status !== 401 || isAuthPath(request.url)) {
            return;
        }
        if (!_refreshSession) return;

        const ok = await _refreshSession();
        if (!ok) {
            throw new SessionExpiredException('Session expired');
        }

        const method = request.method.toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            return;
        }

        const retryResponse = await fetch(request);

        return retryResponse;
    },
});

export const $api = createClient(fetchClient);
