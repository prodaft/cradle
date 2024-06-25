import qs from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to query entities from the API
 * Passes the token and query parameters to the API
 * @param {?string} name - the name of the entity to search for
 * @param {Array<string> | []} entityTypes - the types of entities to search for
 * @param {Array<string> | []} entitySubtype - the types of entries to search for
 * @returns {Promise<AxiosResponse<any, any>>}
 */
export function queryEntities(name, entityTypes, entitySubtype) {
    const url = `/query/`;

    const params = {
        entityType: entityTypes,
        entitySubtype: entitySubtype,
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
