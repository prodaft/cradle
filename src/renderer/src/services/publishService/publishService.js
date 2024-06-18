import QueryString from 'qs';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Function to retrieve the preview of a publish report
 *
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @returns {Promise<AxiosResponse<any>>} - a JSON object containing the related entities, as well as the notes and their content
 */
export function getPublishData(token, noteIds) {
    const path = `/notes/publish/`;
    const queryParams = { note_ids: noteIds };

    return axios({
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        url: path,
        params: queryParams,
        paramsSerializer: (params) =>
            QueryString.stringify(params, { arrayFormat: 'repeat' }),
    });
}
