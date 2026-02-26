import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './schema';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

let _accessToken: string | null = null;

export function setClientAccessToken(token: string | null) {
    _accessToken = token;
}

export const fetchClient = createFetchClient<paths>({
    baseUrl,
    credentials: 'include',
});

fetchClient.use({
    onRequest: async ({ request }) => {
        const headers = new Headers(request.headers);

        if (_accessToken) {
            headers.set('Authorization', `Bearer ${_accessToken}`);
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

export const $api = createClient(fetchClient);
