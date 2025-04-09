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
            ...query,
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
            depth,
        },
    });
}

/**
 * Function to get incrementally fetch the graph
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function fetchGraph(page, page_size, start_date, end_date, source_id) {
    const params = new URLSearchParams({
        page: page.toString(),
        page_size: page_size,
        start_date: start_date,
        end_date: end_date,
    });

    if (source_id) {
        params.append('source', source_id);
    }
    return authAxios({
        method: 'GET',
        url: '/knowledge-graph/fetch/',
        params: params,
    });
}

/**
 * Function to get relations connecting two entries
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getRelations(query, page) {
    return authAxios({
        method: 'GET',
        url: '/entries/relations/',
        params: {
            page,
            ...query,
        },
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });
        },
    });
}

/**
 * Function to delete a relation
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function deleteRelation(id) {
    return authAxios({
        method: 'DELETE',
        url: `/entries/relations/${id}`,
    });
}
