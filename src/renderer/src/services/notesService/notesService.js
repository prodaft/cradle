import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get notes from the API
 * Passes the token and id to the API
 * @param {string} token - JWT token
 * @param {string} id - note id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getNote(token, id) {
    return axios({
        method: 'get',
        url: `/notes/${id}`,
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Function to set the publishable status of a note
 * Passes the token, path, and status to the API
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {number} noteId - The id of the note to set the publishable status of
 * @param {boolean} status - The status to set the note to
 * @returns {Promise<AxiosResponse<string>>}
 */
export function setPublishable(token, noteId, status) {
    const path = `/notes/${noteId}/publishable/`;

    return axios({
        method: 'PUT',
        url: path,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            publishable: status,
        },
    });
}
