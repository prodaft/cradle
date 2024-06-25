import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * The data for an entity. This data needs to be sent to the server to create an entity.
 * @typedef {Object} EntityData
 * @property {string} name - entity name
 * @property {string} description - entity description
 */

/**
 * Sends a POST to create an actor
 *
 * @param {EntityData} data - actor data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createActor(data) {
    return authAxios({
        method: 'post',
        url: '/entities/actors/',
        data: data,
    });
}

/**
 * Sends a POST to create a case
 *
 * @param {EntityData} data - case data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createCase(data, token) {
    return authAxios({
        method: 'post',
        url: '/entities/cases/',
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
        url: '/entities/actors/',
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
        url: '/entities/cases/',
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
 * Sends a DELETE request to delete an entity
 *
 * @param {string} type - entity type : `entities/actors`, `entites/cases`, `users` (use plural form)
 * @param {string} id - entity id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function deleteEntity(type, id) {
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
