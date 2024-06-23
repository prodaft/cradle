import axios from '../axiosInstance/axiosInstance';
/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 *
 * @param {string} path - the API endpoint for a specific dashboard
 * @returns {Promise<AxiosResponse<any>> | *}
 */
export function getDashboardData(path) {
    return axios({
        method: 'GET',
        url: path,
    });
}

/**
 * Function to request access to a case
 *
 * @param {string} id - The case ID to request access to
 * @returns {Promise<AxiosResponse<any>>}
 */
export function requestCaseAccess(id) {
    return axios({
        method: 'POST',
        url: `/access/request/${id}/`,
    });
}
