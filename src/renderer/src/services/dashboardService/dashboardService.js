import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 * @param token
 * @param path
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getDashboardData(token, path){
    return axios({
        method: "GET",
        url: path,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        }
    })
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
export function setPublishable(token, noteId, status){
    const path = `/notes/${noteId}/publishable/`;

    return axios({
        method: "PUT",
        url: path,
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        data: {
            publishable: status
        }
    })
}
