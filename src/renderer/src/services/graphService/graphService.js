import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get the knowledge graph data from the API
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getGraphData() {
    return authAxios({
        method: 'GET',
        url: '/knowledge-graph/',
    });
}

/**
 * Function to get the knowledge graph data from the API
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function queryGraph(query) {
    return authAxios({
        method: 'POST',
        url: '/knowledge-graph/query/',
        data: query,
    });
}
