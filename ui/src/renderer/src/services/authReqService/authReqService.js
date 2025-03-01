import { noAuthAxios } from '../axiosInstance/axiosInstance';
import { getBaseUrl } from '../configService/configService';

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
        baseURL: getBaseUrl(),
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
export async function resetPasswordReq(data) {
    return noAuthAxios({
        baseURL: getBaseUrl(),
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
        baseURL: getBaseUrl(),
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
        baseURL: getBaseUrl(),
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
        baseURL: getBaseUrl(),
        method: 'post',
        url: '/users/',
        data: data,
    });
}
