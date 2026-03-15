import { SessionExpiredException } from '@/components/domain/auth/auth-exceptions';
import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './schema';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const AUTH_PATHS = [
    '/auth/login',
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
    return match ? decodeURIComponent(match[1]) : null;
}

let _accessToken: string | null = null;

export function setClientAccessToken(token: string | null) {
    _accessToken = token;
}

type GetAccessTokenFn = () => Promise<string>;
type RefreshAccessTokenFn = () => Promise<boolean>;

let _getAccessToken: GetAccessTokenFn | null = null;
let _refreshAccessToken: RefreshAccessTokenFn | null = null;

export function setClientAuthCallbacks(
    getAccessToken: GetAccessTokenFn | null,
    refreshAccessToken: RefreshAccessTokenFn | null,
) {
    _getAccessToken = getAccessToken;
    _refreshAccessToken = refreshAccessToken;
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

        if (!isAuthPath(request.url)) {
            let token: string | null = null;
            if (_getAccessToken) {
                try {
                    token = await _getAccessToken();
                } catch {
                    throw new SessionExpiredException('Unable to obtain access token');
                }
            } else if (_accessToken) {
                token = _accessToken;
            }
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
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
        if (!_refreshAccessToken) return;

        const ok = await _refreshAccessToken();
        if (!ok) {
            throw new SessionExpiredException('Session expired');
        }

        const newToken = _accessToken;
        if (!newToken) return;

        const method = request.method.toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            return;
        }

        const newHeaders = new Headers(request.headers);
        newHeaders.set('Authorization', `Bearer ${newToken}`);
        const retryRequest = new Request(request, { headers: newHeaders });
        const retryResponse = await fetch(retryRequest);

        return retryResponse;
    },
});

export const $api = createClient(fetchClient);
