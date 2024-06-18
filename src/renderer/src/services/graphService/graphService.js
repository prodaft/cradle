import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get the knowledge graph data from the API
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getGraphData(token) {
    return axios({
        method: 'GET',
        url: '/knowledge-graph/',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}
