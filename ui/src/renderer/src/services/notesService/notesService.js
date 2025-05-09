import { authAxios } from '../axiosInstance/axiosInstance';
import qs from 'qs';

/**
 * Function to get notes from the API
 * Passes the token and id to the API
 *
 * @param {string} id - note id
 * @param {boolean} footnotes - Whether to retrieve files as footnotes
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getNote = (id, footnotes = true) => {
    return authAxios({
        method: 'get',
        url: `/notes/${id}/`,
        params: { footnotes: footnotes },
    });
};

/**
 * Search notes
 *
 * @param {query} Object - Fields to query
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const searchNote = (query) => {
    return authAxios({
        method: 'get',
        url: `/notes/`,
        params: {
            ...query,
        },
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });
        },
    });
};

/**
 * Function to get notes from the API
 * Passes the token and id to the API
 *
 * @param {string} id - note id
 * @param {Note} data - note data
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const updateNote = (id, data) => {
    return authAxios({
        method: 'post',
        url: `/notes/${id}/`,
        data: data,
    });
};

/**
 * Function to set the publishable status of a note
 * Passes the token, path, and status to the API
 *
 * @param {number} noteId - The id of the note to set the publishable status of
 * @param {boolean} status - The status to set the note to
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const setPublishable = (noteId, status) => {
    const path = `/notes/${noteId}/`;

    return authAxios({
        method: 'POST',
        url: path,
        data: {
            publishable: status,
        },
    });
};

/**
 * Function to delete a note
 *
 * @param {number} id - The id of the note to delete
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const deleteNote = (id) => {
    return authAxios({
        method: 'DELETE',
        url: `/notes/${id}/`,
    });
};

/**
 * Get files for a specific entry
 * @param {string} entryId - The ID of the entry
 * @param {Object} params - Query parameters for filtering and pagination
 * @returns {Promise} - Promise resolving to the API response
 */
export const getFiles = (params = {}) => {
    return authAxios.get(`/notes/files/`, { params });
};

export { getNote, setPublishable, deleteNote, updateNote, searchNote };
