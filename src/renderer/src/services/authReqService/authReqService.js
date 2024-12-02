import { noAuthAxios } from '../axiosInstance/axiosInstance';

/**
 * The credentials of a user.
 * @typedef {Object} UserData
 * @property {string} username - The user's username
 * @property {string} email - The user's email
 * @property {string} password - The user's password
 */

/**
 * Sends a POST request to confirm user email
 *
 * @param {UserData} data - confirmation token
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function confirmReq(data) {
    return noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'post',
        url: '/users/email_confirm/',
        data: data,
    });
}

/**
 * Sends a POST request to change password
 *
 * @param {UserData} data - account details
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function changePasswordReq(data) {
    return noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'put',
        url: '/users/reset_password/',
        data: data,
    });
}

/**
 * Sends a POST request to get password reset email
 *
 * @param {UserData} data - account details
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function forgotPasswordReq(data) {
    return noAuthAxios({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        method: 'post',
        url: '/users/reset_password/',
        data: data,
    });
}

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
