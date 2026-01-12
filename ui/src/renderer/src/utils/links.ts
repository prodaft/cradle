/**
 * Link utilities for handling URLs and redirects
 */

import { FileReference } from '@services/cradle/models';
import QueryString from 'qs';

/**
 * Content types that can be redirected to
 */
export type ContentType = 'note' | 'cradleuser' | 'entry' | 'entryclass';

/**
 * Generates a redirect URL based on content type and id.
 *
 * @param content_type - The type of the content (e.g., "note", "user", "log")
 * @param id - The unique identifier for the content
 * @returns The URL to redirect to based on the content type and id, or null if invalid
 */
export function getRedirectUrl(content_type: string, id: string): string | null {
    switch (content_type) {
        case 'note':
            return `/notes/${id}`;
        case 'cradleuser':
            return `/manage/user-permissions/user/${id}`;
        case 'entry':
            return `/manage/edit-entity/${id}`;
        case 'entryclass':
            return `/manage/edit-entry-class/${id}`;
        default:
            return null;
    }
}

/**
 * Creates a download path for a file. This path corresponds to the download endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @param file - File information
 * @param apiBaseUrl - Base URL of the backend
 * @returns Download link
 */
export const createDownloadPath = (file: FileReference, apiBaseUrl: string): string => {
    const queryParams = QueryString.stringify({
        fileId: file.id!,
    });
    return `${apiBaseUrl}/file-transfer/download/?${queryParams}`;
};

/**
 * Creates a process file path for a file. This path corresponds to the process endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @param apiBaseUrl - Base URL of the backend
 * @returns Process file endpoint
 */
export const createProcessFilePath = (apiBaseUrl: string): string => {
    return `${apiBaseUrl}/file-transfer/process/`;
};

/**
 * Prepends links to the top of the markdown content. This will not be visible in the preview.
 * These links correspond to the backend API download endpoints.
 *
 * @param mdContent - Markdown content
 * @param fileData - File data
 * @param apiBaseUrl - Base URL for creating download paths
 * @returns Markdown content with links prepended
 */
export const prependLinks = (
    mdContent: string,
    fileData: FileReference[],
    apiBaseUrl: string,
): string => {
    const mdLinks = fileData
        .map((file) => {
            const apiDownloadPath = createDownloadPath(file, apiBaseUrl);
            return `[${file.id}-${file.fileName}]: ${apiDownloadPath} "${file.fileName}"\n\n`;
        })
        .join('');

    return mdLinks + mdContent;
};
