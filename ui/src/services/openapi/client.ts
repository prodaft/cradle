import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './schema';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const fetchClient = createFetchClient<paths>({ baseUrl });

fetchClient.use({
    onRequest: async ({ request }) => {
        const token = localStorage.getItem('access_token');
        if (!token) return request;
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return new Request(request, { headers });
    },
});

export const $api = createClient(fetchClient);
