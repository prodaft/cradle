import { authAxios } from '../axiosInstance/axiosInstance';
/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 *
 * @param {string} path - the API endpoint for a specific dashboard (see the OpenAPI specification)
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getDashboardData(path) {
    return authAxios({
        method: 'GET',
        url: path,
    });
}

/**
 * Function to request access to an entity
 *
 * @param {string} id - The entity ID to request access to
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function requestEntityAccess(id) {
    return authAxios({
        method: 'POST',
        url: `/access/request/${id}/`,
    });
}
