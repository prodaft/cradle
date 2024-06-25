import { noAuthAxios } from '../axiosInstance/axiosInstance';

/**
 * The credentials of a user.
 * @typedef {Object} UserData
 * @property {string} username - The user's username
 * @property {string} email - The user's email
 * @property {string} password - The user's password
 */

/**
 * Sends a POST request to authenticate user
 *
 * @param {UserData} data - user credentials
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function logInReq(data) {
    return noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'post',
        url: '/users/login/',
        data: data,
    });
}

/**
 * Sends a POST request to register user
 *
 * @param {UserData} data - user credentials
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function registerReq(data) {
    return noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'post',
        url: '/users/',
        data: data,
    });
}
