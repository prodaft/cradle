import QueryString from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Function to retrieve the preview of a publish report
 *
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @returns {Promise<AxiosResponse<any, any>>} - a JSON object containing the related entries, as well as the notes and their content
 */
export function getPublishOptions() {
    const path = `/reports/publish/`;

    return authAxios({
        method: 'GET',
        url: path,
    });
}

/**
 * Function to publish a set of notes
 *
 * @param {Array<number>} noteIds - The ids of the notes to preview
 * @param {String} title - The title of the post
 * @returns {Promise<AxiosResponse<any, any>>} - a JSON object containing the related entries, as well as the notes and their content
 */
export function publishReport(strategy, noteIds, title) {
    const path = `/reports/publish/`;
    const body = { strategy: strategy, note_ids: noteIds, title: title };

    return authAxios({
        method: 'POST',
        url: path,
        data: body,
    });
}
