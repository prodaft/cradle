import axios from 'axios';

axios.defaults.withCredentials = false;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get notes from the API
 * Passes the token and id to the API
 * @param token - JWT token
 * @param id - note id
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getNote(token, id) {
    return axios({
        method: 'get',
        url: `/notes/${id}`,
        headers: { Authorization: `Bearer ${token}` },
    });
}
