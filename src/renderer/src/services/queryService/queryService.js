import qs from 'qs';
import axios from 'axios';

axios.defaults.withCredentials = false;
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to query entities from the API
 * Passes the token and query parameters to the API
 * @param token - the access token
 * @param name - the name of the entity to search for
 * @param entityTypes - the types of entities to search for (array)
 * @param entitySubtype - the types of entries to search for (array)
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
export async function queryEntities(token, name, entityTypes, entitySubtype) {
    const url = `/query`;

    const params = {
        entityType: entityTypes,
        entitySubtype: entitySubtype,
    };

    if (name) {
        params.name = name;
    }

    return axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        params: params,
        paramsSerializer: (params) => {
            return qs.stringify(params, { arrayFormat: 'repeat' });
        },
    });
}
