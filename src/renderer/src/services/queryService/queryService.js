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
export function queryEntries(name, subtype, page) {
    const url = `/query/`;

    const params = {
        subtype: subtype,
        page: page,
    };

    if (name) {
        params.name = name;
    }

    return authAxios({
        method: 'GET',
        url: url,
        params: params,
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'comma' });
        },
    });
}

/**
 * Function to fetch the LSP pack for the current user
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function fetchLspPack() {
    const url = `/lsp/pack/`;

    return authAxios({
        method: 'GET',
        url: url,
    });
}
