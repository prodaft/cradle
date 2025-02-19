import { authAxios } from '../axiosInstance/axiosInstance';

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
