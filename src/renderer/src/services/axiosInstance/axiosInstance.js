import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

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

    const response = await axios({
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

axios.interceptors.request.use(
    async (config) => {
        let accessToken = localStorage.getItem('access');
        const expirationInSeconds = new Number(localStorage.getItem('expiration'));
        const expirationInMiliseconds = new Date(expirationInSeconds * 1000);

        if (
            expirationInMiliseconds &&
            expirationInMiliseconds < Date.now() + 1000 * 60
        ) {
            // Token has expired or will expire in less than 1 minute
            await refreshAccessToken();
            accessToken = localStorage.getItem('access');
        }

        // The default content type is JSON, unless specified otherwise
        if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }
        config.headers['Authorization'] = `Bearer ${accessToken}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            await refreshAccessToken();
            const accessToken = localStorage.getItem('access');
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            return axios(originalRequest);
        }
        return Promise.reject(error);
    },
);

export default axios;
