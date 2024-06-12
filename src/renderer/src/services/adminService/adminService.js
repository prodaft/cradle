import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Sends a POST to create an actor
 *
 * @param {{name: string, description: string}} data - actor data
 * @param {string} token - JWT access token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createActor(data, token) {
    return axios({
        method: 'post',
        url: '/entities/actors/',
        data: data,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Sends a POST to create a case
 *
 * @param {{name: string, description: string}} data - case data
 * @param {string} token - JWT access token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createCase(data, token) {
    return axios({
        method: 'post',
        url: '/entities/cases/',
        data: data,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Sends a GET request to get all actors
 *
 * @param {string} token - JWT access token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getActors(token) {
    return axios({
        method: 'get',
        url: '/entities/actors/',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Sends a GET request to get all cases
 *
 * @param {string} token - JWT access token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getCases(token) {
    return axios({
        method: 'get',
        url: '/entities/cases/',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Sends a GET request to get all users
 *
 * @param {string} token - JWT access token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getUsers(token) {
    return axios({
        method: 'get',
        url: '/users/',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Sends a DELETE request to delete an entity
 *
 * @param {string} token - JWT access token
 * @param {string} type - entity type : actors, cases, users (use plural form)
 * @param {string} id - entity id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function deleteEntity(token, type, id) {
    return axios({
        method: 'delete',
        url: `/${type}/${id}/`,
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Sends a PUT request to change access level of a user
 *
 * @param {string} token - JWT access token
 * @param {string} userId - user id
 * @param {string} caseId - case id
 * @param {string} accessLevel - access level : none, read, read-write
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function changeAccess(token, userId, caseId, accessLevel) {
    return axios({
        method: 'put',
        url: `/access/${userId}/${caseId}/`,
        data: { access_type: accessLevel },
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Sends a GET request to get permissions for a user
 *
 * @param {string} token - JWT access token
 * @param {string} userId - user id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getPermissions(token, userId) {
    return axios({
        method: 'get',
        url: `/access/${userId}/`,
        headers: { Authorization: `Bearer ${token}` },
    });
}
