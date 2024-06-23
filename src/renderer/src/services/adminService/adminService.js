import axios from '../axiosInstance/axiosInstance';
/**
 * Sends a POST to create an actor
 *
 * @param {{name: string, description: string}} data - actor data
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createActor(data) {
    return axios({
        method: 'post',
        url: '/entities/actors/',
        data: data,
    });
}

/**
 * Sends a POST to create a case
 *
 * @param {{name: string, description: string}} data - case data
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createCase(data, token) {
    return axios({
        method: 'post',
        url: '/entities/cases/',
        data: data,
    });
}

/**
 * Sends a GET request to get all actors
 *
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getActors() {
    return axios({
        method: 'get',
        url: '/entities/actors/',
    });
}

/**
 * Sends a GET request to get all cases
 *
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getCases() {
    return axios({
        method: 'get',
        url: '/entities/cases/',
    });
}

/**
 * Sends a GET request to get all users
 *
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getUsers() {
    return axios({
        method: 'get',
        url: '/users/',
    });
}

/**
 * Sends a DELETE request to delete an entity
 *
 * @param {string} type - entity type : `entities/actors`, `entites/cases`, `users` (use plural form)
 * @param {string} id - entity id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function deleteEntity(type, id) {
    return axios({
        method: 'delete',
        url: `/${type}/${id}/`,
    });
}

/**
 * Sends a PUT request to change access level of a user
 *
 * @param {string} userId - user id
 * @param {string} caseId - case id
 * @param {string} accessLevel - access level : none, read, read-write
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function changeAccess(userId, caseId, accessLevel) {
    return axios({
        method: 'put',
        url: `/access/${userId}/${caseId}/`,
        data: { access_type: accessLevel },
    });
}

/**
 * Sends a GET request to get permissions for a user
 *
 * @param {string} userId - user id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getPermissions(userId) {
    return axios({
        method: 'get',
        url: `/access/${userId}/`,
    });
}
