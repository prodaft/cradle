import QueryString from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to retrieve the preview of a publish report
 *
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @returns {Promise<AxiosResponse<any, any>>} - a JSON object containing the related entries, as well as the notes and their content
 */
export function getPublishData(noteIds) {
    const path = `/notes/publish/`;
    const queryParams = { note_ids: noteIds };

    return authAxios({
        method: 'GET',
        url: path,
        params: queryParams,
        paramsSerializer: (params) =>
            QueryString.stringify(params, { arrayFormat: 'repeat' }),
    });
}

/**
 * Function to publish to catalyst
 *
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @param {String} title - The title of the post
 * @returns {Promise<AxiosResponse<any, any>>} - a JSON object containing the related entries, as well as the notes and their content
 */
export function sendToCatalyst(noteIds, title) {
    const path = `/publish/catalyst/`;
    const body = { note_ids: noteIds, title: title };

    return authAxios({
        method: 'POST',
        url: path,
        data: body,
    });
}
