import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get fleeting notes from the API
 * Passes the token to the API
 *
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNotes() {
    return authAxios({
        method: 'GET',
        url: '/fleeting-notes/',
    });
}

/**
 * Function to add a fleeting note
 * Passes the token and content to the API
 *
 * @param {string} content - The content of the note to add (String)
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} files - information about the files that will be linked
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function addFleetingNote(content, files) {
    return authAxios({
        method: 'POST',
        url: '/fleeting-notes/',
        data: {
            content: content,
            files: files,
        },
    });
}

/**
 * Function to delete a fleeting note
 *
 * @param {string} id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function deleteFleetingNote(id) {
    return authAxios({
        method: 'DELETE',
        url: `/fleeting-notes/${id}/`,
    });
}

/**
 * Function to update a fleeting note
 *
 * @param {string} id - The id of the note to update
 * @param {string} content - The content of the note to update
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} files - information about the files that are linked to this note
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function updateFleetingNote(id, content, files) {
    return authAxios({
        method: 'PUT',
        url: `/fleeting-notes/${id}/`,
        data: {
            content: content,
            files: files,
        },
    });
}

/**
 * Function to get a fleeting note by id
 *
 * @param {string} id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getFleetingNoteById(id) {
    return authAxios({
        method: 'GET',
        url: `/fleeting-notes/${id}/`,
    });
}

/**
 * Function to save a fleeting note as final
 *
 * @param {string} id - The id of the note to update
 * @param {boolean} publishable - Whether the note is publishable
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function saveFleetingNoteAsFinal(id, publishable) {
    return authAxios({
        method: 'PUT',
        url: `/fleeting-notes/${id}/final/`,
        data: {
            publishable: publishable,
        },
    });
}
