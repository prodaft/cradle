import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get fleeting notes from the API
 * Passes the token to the API
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNotes(token) {
    return axios({
        method: 'GET',
        url: '/fleeting-notes/',
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Function to add a fleeting note
 * Passes the token and content to the API
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {string} content - The content of the note to add (String)
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} files - information about the files that will be linked
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function addFleetingNote(token, content, files) {
    return axios({
        method: 'POST',
        url: '/fleeting-notes/',
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            content: content,
            files: files,
        },
    });
}

/**
 * Function to delete a fleeting note
 * @param {string} token
 * @param {string} id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function deleteFleetingNote(token, id) {
    return axios({
        method: 'DELETE',
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Function to update a fleeting note
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {string} id - The id of the note to update
 * @param {string} content - The content of the note to update
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} files - information about the files that are linked to this note
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function updateFleetingNote(token, id, content, files) {
    return axios({
        method: 'PUT',
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            content: content,
            files: files,
        },
    });
}

/**
 * Function to get a fleeting note by id
 * @param {string} token
 * @param {string} id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNoteById(token, id) {
    return axios({
        method: 'GET',
        url: `/fleeting-notes/${id}/`,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Function to save a fleeting note as final
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {string} id - The id of the note to update
 * @param {boolean} publishable - Whether the note is publishable
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function saveFleetingNoteAsFinal(token, id, publishable) {
    return axios({
        method: 'PUT',
        url: `/fleeting-notes/${id}/final/`,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            publishable: publishable,
        },
    });
}
