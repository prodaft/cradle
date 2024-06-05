import axios from 'axios';
import QueryString from 'qs';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:8000";

/**
 * Function to retrieve the preview of a publish report
 * 
 * @param {string} token - The (JWT) token to authenticate the request
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @returns {Promise<AxiosResponse<any>>} - a JSON object containing the related entities, as well as the notes and their content
 */
export function getPublishData(token, noteIds) {
    const path = `/notes/publish`;
    const queryParams = { note_ids: noteIds };

    return axios({
        method: "GET",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        url: path,
        params: queryParams,
        paramsSerializer: params => QueryString.stringify(params, { arrayFormat: 'repeat' }),
    })
}