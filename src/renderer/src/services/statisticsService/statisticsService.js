import { authAxios } from '../axiosInstance/axiosInstance';
/**
 * Function to get statistics of a user from the API.
 * It returns recent activity about actors, cases, notes
 * See the OpenAPI documentation for more information on what this should return.
 *
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
export async function getStatistics() {
    return authAxios({
        method: 'GET',
        url: '/statistics/',
    });
}
