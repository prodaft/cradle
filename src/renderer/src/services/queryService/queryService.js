import qs from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to query entries from the API
 * Passes the token and query parameters to the API
 * @param {?string} name - the name of the entry to search for
 * @param {Array<string>} entryTypes - the types of entries to search for
 * @param {Array<string>} entrySubtype - the types of artifacts to search for
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function queryEntries(name, entryTypes, entrySubtype) {
    const url = `/query/`;

    const params = {
        entryType: entryTypes,
        entrySubtype: entrySubtype,
    };

    if (name) {
        params.name = name;
    }

    return authAxios({
        method: 'GET',
        url: url,
        params: params,
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });
        },
    });
}
