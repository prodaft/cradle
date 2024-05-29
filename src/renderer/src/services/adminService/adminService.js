import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Sends a POST to create an actor
 * @param data - actor data : {name, description}
 * @param token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createActor(data, token) {
    return axios({
        method: "post",
        url: "/entities/actors/",
        data: data,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`}
    });
}

/**
 * Sends a POST to create a case
 * @param data - case data : {name, description}
 * @param token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function createCase(data, token) {
    return axios({
        method: "post",
        url: "/entities/cases/",
        data: data,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
}

/**
 * Sends a GET request to get all actors
 * @param token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getActors(token) {
    return axios({
        method: "get",
        url: "/entities/actors/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

/**
 * Sends a GET request to get all cases
 * @param token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getCases(token) {
    return axios({
        method: "get",
        url: "/entities/cases/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

/**
 * Sends a GET request to get all users
 * @param token
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getUsers(token) {
    return axios({
        method: "get",
        url: "/users/",
        headers: {"Authorization": `Bearer ${token}`}
    });
}

/**
 * Sends a DELETE request to delete an entity
 * @param token
 * @param type - entity type : actors, cases, users (please use plural form)
 * @param id - entity id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function deleteEntity(token, type, id){
    return axios({
        method: "delete",
        url: `/${type}/${id}/`,
        headers: {"Authorization": `Bearer ${token}`}
    })
}

/**
 * Sends a PUT request to change access level of a user
 * @param token
 * @param userId - user id
 * @param caseId - case id
 * @param accessLevel - access level : none, read, read-write
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function changeAccess(token, userId, caseId, accessLevel) {
    return axios({
        method: "put",
        url: `/access/${userId}/${caseId}/`,
        data: { "access_type": accessLevel },
        headers: {"Authorization": `Bearer ${token}`}
    });
}

/**
 * Sends a GET request to get permissions for a user
 * @param token
 * @param userId - user id
 * @returns {Promise<Promise<AxiosResponse<any>> | *>}
 */
export async function getPermissions(token, userId) {
    return axios({
        method: "get",
        url: `/access/${userId}/`,
        headers: {"Authorization": `Bearer ${token}`}
    });
}



