import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * The data for an entry. This data needs to be sent to the server to create an entry.
 * @typedef {Object} EntryData
 * @property {string} name - entry name
 * @property {string} description - entry description
 */

/**
 * Sends a POST to create an actor
 *
 * @param {EntryData} data - actor data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createActor(data) {
    return authAxios({
        method: 'post',
        url: '/entries/actors/',
        data: data,
    });
}

/**
 * Sends a POST to create a case
 *
 * @param {EntryData} data - case data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createCase(data, token) {
    return authAxios({
        method: 'post',
        url: '/entries/cases/',
        data: data,
    });
}

/**
 * Sends a GET request to get all actors
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getActors() {
    return authAxios({
        method: 'get',
        url: '/entries/actors/',
    });
}

/**
 * Sends a GET request to get all cases
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getCases() {
    return authAxios({
        method: 'get',
        url: '/entries/cases/',
    });
}

/**
 * Sends a GET request to get all users
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getUsers() {
    return authAxios({
        method: 'get',
        url: '/users/',
    });
}

/**
 * Sends a DELETE request to delete an entry
 *
 * @param {string} type - entry type : `entries/actors`, `entries/cases`, `users` (use plural form)
 * @param {string} id - entry id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function deleteEntry(type, id) {
    return authAxios({
        method: 'delete',
        url: `/${type}/${id}/`,
    });
}

/**
 * Sends a PUT request to change access level of a user
 *
 * @param {string} userId - user id
 * @param {string} caseId - case id
 * @param {string} accessLevel - access level : "none", "read", "read-write"
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function changeAccess(userId, caseId, accessLevel) {
    return authAxios({
        method: 'put',
        url: `/access/${userId}/${caseId}/`,
        data: { access_type: accessLevel },
    });
}

/**
 * Sends a GET request to get permissions for a user
 *
 * @param {string} userId - user id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getPermissions(userId) {
    return authAxios({
        method: 'get',
        url: `/access/${userId}/`,
    });
}
