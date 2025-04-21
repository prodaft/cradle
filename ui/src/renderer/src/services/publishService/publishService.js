import QueryString from 'qs';
import { authAxios } from '../axiosInstance/axiosInstance';

/**
 * Returns available strategies (upload/download).
 */
export function getPublishOptions() {
    const path = `/reports/publish/`;
    return authAxios({
        method: 'GET',
        url: path,
    });
}

/**
 * Publish a set of notes with the given strategy and title.
 */
export function publishReport(strategy, noteIds, title, anonymized) {
    const path = `/reports/publish/`;
    const body = { strategy, note_ids: noteIds, title, anonymized: anonymized };

    return authAxios({
        method: 'POST',
        url: path,
        data: body,
    });
}

/**
 * Retrieve a single report by UUID.
 */
export function getReport(reportId) {
    const path = `/reports/${reportId}/`;
    return authAxios({
        method: 'GET',
        url: path,
    });
}

/**
 * Retrieve a paginated list of reports (optional query).
 */
export function getReports(query) {
    const path = '/reports/';
    return authAxios({
        method: 'GET',
        url: path,
        params: query,
    });
}

/**
 * Delete a specific report by UUID.
 * Expects the backend to accept DELETE /reports/ with JSON body { id: <uuid> }.
 */
export function deleteReport(reportId) {
    const path = `/reports/${reportId}/`;

    return authAxios({
        method: 'DELETE',
        url: path,
    });
}

/**
 * Edit a specific report by UUID.
 */
export function editReport(reportId, data) {
    const path = `/reports/${reportId}/`;

    return authAxios({
        method: 'PUT',
        url: path,
        data: data,
    });
}

/**
 * Retry a report (re-run generation).
 * This calls a backend endpoint that you will add (POST /reports/<reportId>/retry/).
 */
export function retryReport(reportId) {
    const path = `/reports/${reportId}/retry/`;

    return authAxios({
        method: 'POST',
        url: path,
    });
}

// Updated importReport function that sends the file under "report"
export function importReport(file) {
    const formData = new FormData();
    formData.append('report', file);

    return authAxios({
        method: 'POST',
        url: '/reports/import/',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
}
