import { noAuthAxios } from '../axiosInstance/axiosInstance';

/**
 * Sends a POST request to authenticate user
 *
 * @param {{ username: string, password: string }} data - user credentials
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function logInReq(data) {
    return noAuthAxios({
        method: 'post',
        url: `${import.meta.env.VITE_API_BASE_URL}/users/login/`,
        data: data,
    });
}

/**
 * Sends a POST request to register user
 *
 * @param { username: string, password: string } data - user credentials
 * @returns {Promise<AxiosResponse<any>>}
 */
export async function registerReq(data) {
    return noAuthAxios({
        method: 'post',
        url: `${import.meta.env.VITE_API_BASE_URL}/users/`,
        data: data,
    });
}
