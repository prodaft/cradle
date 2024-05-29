import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Saves a note to the database
 * Sends a POST request to '/notes/', with the text in the request body
 * 
 * @param {string} text  - JSON: { "content": <the text to save> }
 * @param {string} token The user's JWT
 * @returns {Promise} The response from the server
 * @throws {Error} see the OpenApi specification
 */
async function saveNote(token, text) {
    return axios({
        method: "post",
        url: "/notes/",
        data: {
            content: text,
        },
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }, 
    });
}

export { saveNote }