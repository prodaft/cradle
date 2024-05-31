import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Function to get notes from the API
 * Passes the token and id to the API
 * @param token - JWT token
 * @param id - note id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getNote(token,id) {
    return axios({
        method: "get",
        url: `/notes/${id}`,
        headers: {"Authorization": `Bearer ${token}`}
    });
}