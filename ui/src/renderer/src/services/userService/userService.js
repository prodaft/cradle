import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Gets the details for a user
 *
 * @param {string} id - The id of the user to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createUser(data) {
    return authAxios({
        method: 'post',
        url: `/users/`,
        data: data,
    });
}

/**
 * Gets the details for a user
 *
 * @param {string} id - The id of the user to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getUser(id) {
    return authAxios({
        method: 'get',
        url: `/users/${id}/`,
    });
}

/**
 * Sends a DELETE request to delete a user
 *
 * @param {string} id - The id of the user to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function deleteUser(id) {
    return authAxios({
        method: 'delete',
        url: `/users/${id}/`,
    });
}

/**
 * Sends a POST request to update a user
 *
 * @param {string} id - The id of the user to be deleted
 * @param {object} data - The fields to update for the user
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function updateUser(id, data) {
    return authAxios({
        method: 'post',
        url: `/users/${id}/`,
        data: data,
    });
}

export async function changePassword(oldPassword, newPassword) {
    return authAxios({
        method: 'post',
        url: '/users/change_password/',
        data: { old_password: oldPassword, new_password: newPassword },
    });
}

/**
 * Sends a POST request to generate an api key for auser
 *
 * @param {string} id - The id of the user to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function generateApiKey(id) {
    return authAxios({
        method: 'post',
        url: `/users/${id}/apikey`,
    });
}

/**
 * Sends a DELETE request to DELETE an api key for a user
 *
 * @param {string} id - The id of the user to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function deleteApiKey(id) {
    return authAxios({
        method: 'delete',
        url: `/users/${id}/apikey`,
    });
}

/**
 * Sends a POST request to initiate 2FA setup
 * Returns the QR code and secret for initial setup
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function initiate2FA() {
    return authAxios({
        method: 'post',
        url: '/users/2fa/enable/',
    });
}

/**
 * Sends a POST request to enable 2FA for the user
 * Verifies the initial setup code and activates 2FA
 *
 * @param {string} code - The verification code from authenticator app
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function enable2FA(code) {
    return authAxios({
        method: 'post',
        url: '/users/2fa/verify/',
        data: { token: code },
    });
}

/**
 * Sends a POST request to verify a 2FA code
 * Used during login or for sensitive operations
 *
 * @param {string} code - The verification code from authenticator app
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function verify2FACode(code) {
    return authAxios({
        method: 'post',
        url: '/users/2fa/verify/',
        data: { token: code },
    });
}

/**
 * Sends a DELETE request to disable 2FA for the user
 * Requires current 2FA code for security
 *
 * @param {string} code - The current verification code from authenticator app
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function disable2FA(code) {
    return authAxios({
        method: 'post',
        url: '/users/2fa/disable/',
        data: { token: code },
    });
}