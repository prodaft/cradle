import { getBaseUrl } from '../configService/configService';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const authAxios = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
});

const noAuthAxios = axios.create();

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh');
    if (!refreshToken) return;

    const response = await noAuthAxios({
        baseURL: getBaseUrl(),
        method: 'POST',
        url: '/users/refresh/',
        data: { refresh: refreshToken },
    });

    if (response.status === 200) {
        const accessToken = response.data.access;
        localStorage.setItem('access', accessToken);
        const decodedAccessToken = jwtDecode(accessToken);
        localStorage.setItem('expiration', decodedAccessToken['exp'].toString());
    }
};

authAxios.interceptors.request.use(
    async (config) => {
        let accessToken = localStorage.getItem('access');
        const expirationInSeconds = Number(localStorage.getItem('expiration'));
        const expirationInMilliseconds = new Date(expirationInSeconds * 1000);

        if (!accessToken) return config;

        if (expirationInMilliseconds < Date.now() + 1000 * 60) {
            await refreshAccessToken();
            accessToken = localStorage.getItem('access');
        }

        config.headers['Authorization'] = `Bearer ${accessToken}`;
        return config;
    },
    (error) => Promise.reject(error),
);

export { authAxios, noAuthAxios };
