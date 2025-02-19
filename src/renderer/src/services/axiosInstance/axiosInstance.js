import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// An axios instance with default JSON headers and a base URL to the backend API
// It will be used for all internal requests and it will automatically refresh the JWT if it has expired
const authAxios = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// A default axios instance that will be used for all other requests
// (e.g. to minio or when no authorization headers are needed)
const noAuthAxios = axios.create();

/**
 * Refresh the access token using the refresh token. These are both stored in local storage.
 *
 * @returns {Promise<void>}
 * @throws {Error}
 */
const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh');

    if (!refreshToken) {
        return;
    }

    const response = await noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'POST',
        url: '/users/refresh/',
        data: {
            refresh: refreshToken,
        },
    });

    if (response.status === 200) {
        const accessToken = response.data.access;
        localStorage.setItem('access', accessToken);
        const decodedAccessToken = jwtDecode(accessToken);
        const expiration = decodedAccessToken['exp'];
        localStorage.setItem('expiration', expiration.toString());
    }
};

/**
 * Add the Authorization header to each request.
 * If no Content-Type header is specified, the default is `application/json`.
 * If the access token has expired, the refresh token is used to get a new access token.
 * The access token and refresh token are stored in local storage.
 */
authAxios.interceptors.request.use(
    async (config) => {
        let accessToken = localStorage.getItem('access');
        const expirationInSeconds = new Number(localStorage.getItem('expiration'));
        const expirationInMilliseconds = new Date(expirationInSeconds * 1000);

        if (!accessToken) {
            return config;
        }

        if ( expirationInMilliseconds &&
            expirationInMilliseconds < Date.now() + 1000 * 60
        ) {
            // Token has expired or will expire in less than 1 minute
            await refreshAccessToken();
            accessToken = localStorage.getItem('access');
        }

        config.headers['Authorization'] = `Bearer ${accessToken}`;

        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

export { authAxios, noAuthAxios };
