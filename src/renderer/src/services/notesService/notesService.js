import axios from '../axiosInstance/axiosInstance';
/**
 * Function to get notes from the API
 * Passes the token and id to the API
 *
 * @param {string} id - note id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
const getNote = (id) => {
    return axios({
        method: 'get',
        url: `/notes/${id}/`,
    });
};

/**
 * Function to set the publishable status of a note
 * Passes the token, path, and status to the API
 *
 * @param {number} noteId - The id of the note to set the publishable status of
 * @param {boolean} status - The status to set the note to
 * @returns {Promise<AxiosResponse<string>>}
 */
const setPublishable = (noteId, status) => {
    const path = `/notes/${noteId}/publishable/`;

    return axios({
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
 * @returns {Promise<AxiosResponse<string>>}
 */
const deleteNote = (id) => {
    return axios({
        method: 'DELETE',
        url: `/notes/${id}/`,
    });
};

export { getNote, setPublishable, deleteNote };
