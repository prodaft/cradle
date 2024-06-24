import { authAxios } from '../axiosInstance/axiosInstance';
/**
 * Saves a note to the database
 * Sends a POST request to '/notes/', with the text in the request body
 *
 * @param {string} text  - the text to save
 * @param {boolean} publishable - whether to save the note as publishable
 * @param {Array<import('../../components/Editor/Editor').FileData> | []} files - information about the files that will be linked
 * @returns {Promise} The response from the server
 * @throws {Error} see the OpenApi specification
 */
async function saveNote(text, publishable, files) {
    return authAxios({
        method: 'post',
        url: '/notes/',
        data: {
            content: text,
            publishable: publishable,
            files: files,
        },
    });
}

export { saveNote };
