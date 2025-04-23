import qs from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to query entries from the API
 * Passes the token and query parameters to the API
 * @param {?string} name - the name of the entry to search for
 * @param {Array<string>} entryTypes - the types of entries to search for
 * @param {Array<string>} entrySubtype - the types of artifacts to search for
 * @param {number} page - the page number to fetch
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function queryEntries(filters, page = 1) {
    const url = `/query/`;

    filters.page = page;

    return authAxios({
        method: 'GET',
        url: url,
        params: filters,
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' });
        },
    });
}

/**
 * Function to query entries from the API
 * Passes the token and query parameters to the API
 * @param {Array<string>} query - the query string
 * @param {number} page - the page number to fetch
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function advancedQuery(query, wildcard = false, page = 1) {
    const url = `/query/advanced/`;

    return authAxios({
        method: 'GET',
        url: url,
        params: { query, wildcard, page },
    });
}

/**
 * Function to fetch the LSP pack for the current user
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function fetchLspTypes() {
    const url = `/lsp/types/`;

    return authAxios({
        method: 'GET',
        url: url,
    });
}

/**
 * Function to fetch the LSP pack for the current user
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function fetchCompletionTries(type, prefix) {
    const url = `/lsp/trie/`;

    if (type && prefix) {
      return authAxios({
          method: 'GET',
          url: url,
          params: { type, prefix },
      });
    }

    return authAxios({
        method: 'GET',
        url: url,
    });
}
