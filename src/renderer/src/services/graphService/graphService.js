import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get the knowledge graph data from the API
 *
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getGraphData() {
    return authAxios({
        method: 'GET',
        url: '/knowledge-graph/',
    });
}
