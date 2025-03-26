import { authAxios } from '../axiosInstance/axiosInstance';
import qs from 'qs';

/**
 * Function to get the knowledge graph data from the API
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function graphPathFind(query) {
    return authAxios({
        method: 'POST',
        url: '/knowledge-graph/pathfind/',
        data: query,
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' });
        },
    });
}


/**
 * Function to query entries up to a certain depth from an entry
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function searchRelatedEntries(src, depth, page, query) {
    return authAxios({
        method: 'GET',
        url: '/knowledge-graph/neighbors/',
        params: {
          src,
          depth,
          page,
          ...query
        },
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' });
        },
    });
}


/**
 * Function to get inaccessible entry ids at depth
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getInaccessibleEntities(src, depth) {
    return authAxios({
        method: 'GET',
        url: '/knowledge-graph/inaccessible/',
        params: {
          src,
          depth
        }
    });
}
