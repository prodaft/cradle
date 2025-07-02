import { authAxios } from '../axiosInstance/axiosInstance';
import qs from 'qs';

/**
 * Function to get a specific snippet from the API
 * Passes the token and id to the API
 *
 * @param {string} id - snippet id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getSnippet = (id) => {
    return authAxios({
        method: 'get',
        url: `/notes/snippets/${id}/`,
    });
};

/**
 * Function to get all snippets accessible to the user
 * Returns both user snippets and system snippets
 *
 * @param {Object} params - Query parameters for filtering and pagination
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getSnippets = () => {
    return authAxios({
        method: 'get',
        url: `/notes/snippets/`,
    });
};

/**
 * Function to get user's own snippets
 * Optionally filter by specific user_id (null for system snippets)
 *
 * @param {string|null} userId - User ID to filter by, null for system snippets
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getUserSnippets = (userId) => {
    const params = {};

    return authAxios({
        method: 'get',
        url: `/notes/snippets/user/${userId}/`,
    });
};

/**
 * Function to get system snippets
 * This is now handled by getUserSnippets with userId=null
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getSystemSnippets = () => {
    return getUserSnippets(null);
};

/**
 * Function to create a new snippet
 * Creates a snippet owned by the current user or system (if isSystem=true)
 *
 * @param {Object} data - snippet data
 * @param {boolean} isSystem - whether to create as system snippet (null owner)
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const createSnippet = (data, owner) => {
    const payload = { ...data };

    return authAxios({
        method: 'post',
        url: `/notes/snippets/user/${owner}/`,
        data: payload,
    });
};

/**
 * Function to create a system snippet
 * Now handled by createSnippet with isSystem=true
 * Requires admin privileges
 *
 * @param {Object} data - snippet data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const createSystemSnippet = (data) => {
    return createSnippet(data, true);
};

/**
 * Function to update a snippet
 * System snippets can only be updated by admins
 *
 * @param {string} id - snippet id
 * @param {Object} data - snippet data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const updateSnippet = (id, data) => {
    return authAxios({
        method: 'put',
        url: `/notes/snippets/${id}/`,
        data: data,
    });
};

/**
 * Function to partially update a snippet
 * System snippets can only be updated by admins
 *
 * @param {string} id - snippet id
 * @param {Object} data - partial snippet data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const patchSnippet = (id, data) => {
    return authAxios({
        method: 'patch',
        url: `/notes/snippets/${id}/`,
        data: data,
    });
};

/**
 * Function to delete a snippet
 * System snippets can only be deleted by admins
 * Users can only delete their own snippets
 *
 * @param {string} id - snippet id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const deleteSnippet = (id) => {
    return authAxios({
        method: 'delete',
        url: `/notes/snippets/${id}/`,
    });
};

export {
    getSnippet,
    getSnippets,
    getUserSnippets,
    getSystemSnippets,
    createSnippet,
    createSystemSnippet,
    updateSnippet,
    patchSnippet,
    deleteSnippet,
};
