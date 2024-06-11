import axios from 'axios';

axios.defaults.withCredentials = false;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Saves a note to the database
 * Sends a POST request to '/notes/', with the text in the request body
 *
 * @param {string} token The user's JWT
 * @param {string} text  - the text to save
 * @param {boolean} publishable - whether to save the note as publishable
 * @returns {Promise} The response from the server
 * @throws {Error} see the OpenApi specification
 */
async function saveNote(token, text, publishable) {
    return axios({
        method: 'post',
        url: '/notes/',
        data: {
            content: text,
            publishable: publishable,
        },
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

export { saveNote };
