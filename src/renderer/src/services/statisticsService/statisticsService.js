import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get statistics of a user from the API.
 * It returns recent activity about actors, cases, notes
 * See the OpenAPI documentation for more information on what this should return.
 *
 * @param {string} token - the (JWT) token of the user
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
export async function getStatistics(token) {
    return axios({
        method: 'GET',
        url: '/statistics/',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}
