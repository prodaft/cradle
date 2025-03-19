import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get the mapping types
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappingTypes() {
    return authAxios({
        method: 'GET',
        url: '/intelio/mappings/',
    });
}


/**
 * Function to get the mapping keys
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappingKeys(id) {
    return authAxios({
        method: 'GET',
        url: `/intelio/mappings/${id}/keys`,
    });
}

/**
 * Function to get the mappings
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getMappings(id) {
    return authAxios({
        method: 'GET',
        url: `/intelio/mappings/${id}/`,
    });
}


/**
 * Function to save a mapping
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function saveMapping(id, mapping) {
    return authAxios({
        method: 'POST',
        url: `/intelio/mappings/${id}/`,
        data: mapping,
    });
}


/**
 * Function to delete a mapping
 *
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function deleteMapping(id, mappingId) {
    return authAxios({
        method: 'DELETE',
        url: `/intelio/mappings/${id}/`,
        params: { mapping_id: mappingId },
    });
}
