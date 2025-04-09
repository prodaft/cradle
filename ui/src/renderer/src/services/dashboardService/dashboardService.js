import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to get dashboard data from the API
 * Passes the token and path to the API
 *
 * @param {string} path - the API endpoint for a specific dashboard (see the OpenAPI specification)
 * @param {string} search - the search string for the entity we are requesting the dashboard for
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getDashboardData(path, search) {
    return authAxios({
        method: 'GET',
        url: path + search,
    });
}

/**
 * Function to get second hop information for the Dashboard
 * Passes the token and path to the API
 *
 * @param {string} path - the API endpoint for a specific dashboard (see the OpenAPI specification)
 * @param {string} search - the search string for the entity we are requesting the dashboard for
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getSecondHopData(path, search) {
    return authAxios({
        method: 'GET',
        url: path + 'level2' + search,
    });
}

/**
 * Function to request access to an entity
 *
 * @param {string} id - The entity ID to request access to
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function requestEntityAccess(id, subtype = null) {
    return authAxios({
        method: 'POST',
        url: `/access/request/${id}/`,
        params: subtype && { subtype },
    });
}


/**
 * Function to get available enrichment techniques
 *
 * @param {string} id - The entry's id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function getEnrichmentTechniques(id) {
    return authAxios({
        method: 'GET',
        url: `/entries/entries/${id}/enrich/`,
    });
}


/**
 * Function to get available enrichment techniques
 *
 * @param {string} id - The entry's id
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function enrichEntry(id, technique) {
    return authAxios({
        method: 'POST',
        url: `/entries/entries/${id}/enrich/`,
        data: {
            enricher: technique,
        },
    });
}
