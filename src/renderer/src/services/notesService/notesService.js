import { authAxios } from '../axiosInstance/axiosInstance';
/**
 * Function to get notes from the API
 * Passes the token and id to the API
 *
 * @param {string} id - note id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
const getNote = (id) => {
    return authAxios({
        method: 'get',
        url: `/notes/${id}/`,
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
        data: data
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
    const path = `/notes/${noteId}/publishable/`;

    return authAxios({
        method: 'PUT',
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

export { getNote, setPublishable, deleteNote, updateNote };
