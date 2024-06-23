import axios from '../axiosInstance/axiosInstance';

/**
 * Function to get the knowledge graph data from the API
 *
 * @returns {Promise<AxiosResponse<any>>}
 */
export function getGraphData() {
    return axios({
        method: 'GET',
        url: '/knowledge-graph/',
    });
}
