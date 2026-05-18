/**
 * Link utilities for handling URLs and redirects
 */

import type { FileReferenceWithNote } from '@/types';

/**
 * Creates a download path for a file. This path corresponds to the download endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @param file - File information
 * @param apiBaseUrl - Base URL of the backend
 * @returns Download link
 */
export const createDownloadPath = (
    file: FileReferenceWithNote,
    apiBaseUrl: string,
): string => {
    const params = new URLSearchParams({ file_id: file.id! });
    return `${apiBaseUrl}/file-transfer/download/?${params.toString()}`;
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
    fileData: FileReferenceWithNote[],
    apiBaseUrl: string,
): string => {
    const mdLinks = fileData
        .map((file) => {
            const apiDownloadPath = createDownloadPath(file, apiBaseUrl);
            let defs = `[${file.id}]: ${apiDownloadPath} "${file.file_name}"\n\n`;
            const compositeKey = `${file.id}-${file.file_name}`;
            if (compositeKey !== file.id) {
                defs += `[${compositeKey}]: ${apiDownloadPath} "${file.file_name}"\n\n`;
            }
            return defs;
        })
        .join('');

    return mdLinks + mdContent;
};
