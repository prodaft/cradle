import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {string} path - the API endpoint for a specific dashboard
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getDashboardData(token, path) {
    return axios({
        method: 'GET',
        url: path,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Function to request access to a case
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {string} id - The case ID to request access to
 * @returns {Promise<AxiosResponse<any>>}
 */
export function requestCaseAccess(token, id) {
    return axios({
        method: 'POST',
        url: `/access/request/${id}/`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
}
