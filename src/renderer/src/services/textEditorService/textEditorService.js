import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Sends a POST request to 'http://localhost:8000/note/', with the text in the request body
 * 
 * @param {string} text - text of the note to be saved
 */
async function saveNote(text) {
    return await axios({
        method: "post",
        url: "/note/",
        data: text,
        headers: { 
            "Content-Type": "application/json",
            // "Authorization": `Bearer `
        }, 
    });
}

export { saveNote }