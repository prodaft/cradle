/**
 * Link utilities for handling URLs and redirects
 */

import { FileData } from "@/types";
import QueryString from "qs";

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
 * Mimics Python's strip() function for strings.
 * Removes leading and trailing characters specified in the chars parameter.
 * If no chars parameter is provided, it removes whitespace by default.
 *
 * @param str - The string to strip
 * @param chars - Characters to remove (defaults to whitespace)
 * @returns The stripped string
 */
export function strip(str: string, chars: string = ' \t\n\r\f\v'): string {
  // Escape special regex characters in the chars string
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Create a RegExp pattern for the characters to strip
  const pattern = new RegExp(
    `^[${escapeRegExp(chars)}]+|[${escapeRegExp(chars)}]+$`,
    'g'
  );

  // Return the string with leading and trailing specified characters removed
  return str.replace(pattern, '');
}

/**
 * Creates a download path for a file. This path corresponds to the download endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @param file - File information
 * @param apiBaseUrl - Base URL of the backend
 * @returns Download link
 */
export const createDownloadPath = (file: FileData, apiBaseUrl: string): string => {
  const { minioFileName, bucketName } = file;
  const queryParams = QueryString.stringify({
    bucketName: bucketName,
    minioFileName: minioFileName,
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
export const prependLinks = (mdContent: string, fileData: FileData[], apiBaseUrl: string): string => {
  const mdLinks = fileData
    .map((file) => {
      const apiDownloadPath = createDownloadPath(file, apiBaseUrl);
      return `[${file.minioFileName}]: ${apiDownloadPath} "${file.fileName}"\n\n`;
    })
    .join('');

  return mdLinks + mdContent;
};

