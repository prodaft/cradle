import { authAxios } from '../axiosInstance/axiosInstance';

var EntryClassesCached = null;

/**
 * The data for an entry. This data needs to be sent to the server to create an entry.
 * @typedef {Object} EntryData
 * @property {string} name - entry name
 * @property {string} description - entry description
 */

/**
 * The data for an artifact class. This data needs to be sent to the server to create an artifact class.
 * @typedef {Object} ArtifactClass
 * @property {string} name - entry name
 * @property {string} format - format of the entity
 * @property {string} format_argument - details for formatting entry if exists
 */

/**
 * Sends a POST to create an entity
 *
 * @param {EntryData} data - entity data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createEntity(data, token) {
    return authAxios({
        method: 'post',
        url: '/entries/entities/',
        data: data,
    });
}

/**
 * Sends an UPDATE to create an entity
 *
 * @param {EntryData} data - entity data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function editEntity(data, id) {
    return authAxios({
        method: 'post',
        url: `/entries/entities/${id}/`,
        data: data,
    });
}

/**
 * Sends a POST to create an artifact class
 *
 * @param {ArtifactClass} data - artifact class data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function createArtifactClass(data, token) {
    return authAxios({
        method: 'post',
        url: '/entries/entry_classes/',
        data: data,
    });
}

/**
 * Sends a POST to edit an artifact class
 *
 * @param {ArtifactClass} data - artifact class data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function editArtifactClass(data, type) {
    return authAxios({
        method: 'post',
        url: `/entries/entry_classes/${type}/`,
        data: data,
    });
}

/**
 * Sends a GET request to get all entities
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getEntities() {
    return authAxios({
        method: 'get',
        url: '/entries/entities/',
    });
}

/**
 * Sends a GET request to get all entry classes
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getEntryClasses() {
    if (EntryClassesCached) {
        return EntryClassesCached;
    } else {
        EntryClassesCached = authAxios({
            method: 'get',
            url: '/entries/entry_classes/',
        })
            .then((response) => {
                EntryClassesCached = new Promise((callback) =>
                    callback(JSON.parse(JSON.stringify(response))),
                );
                return response;
            })
            .catch(function (err) {
                EntryClassesCached = null; // Clear the cache if we get an error
                throw err;
            });

        return EntryClassesCached;
    }
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
 * @param {string} type - entry type : `entries/entities`, `users` (use plural form)
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
 * Sends a DELETE request to delete an artifact class
 *
 * @param {string} type - artifact class to be deleted
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function deleteArtifactClass(type) {
    return authAxios({
        method: 'delete',
        url: `/entries/entry_classes/${type}/`,
    });
}

/**
 * Sends a PUT request to change access level of a user
 *
 * @param {string} userId - user id
 * @param {string} entityId - entity id
 * @param {string} accessLevel - access level : "none", "read", "read-write"
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function changeAccess(userId, entityId, accessLevel) {
    return authAxios({
        method: 'put',
        url: `/access/${userId}/${entityId}/`,
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

/**
 * Gets a pair of access/refresh tokens to simulate a user
 *
 * @param {string} userId - user id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export async function getSimulatedTokens(userId) {
    return authAxios({
        method: 'get',
        url: `/users/${userId}/simulate`,
    });
}
