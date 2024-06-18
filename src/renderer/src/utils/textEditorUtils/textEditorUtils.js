import DOMPurify from 'dompurify';
import parseMarkdown from '../customParser/customParser';
import QueryString from 'qs';

/**
 * Parses markdown content into HTML using a custom marked.js parser
 * Sanitizing is recommended by the marked documentation: https://github.com/markedjs/marked?tab=readme-ov-file#usage
 *
 * @param {string} content - Markdown syntax
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} [fileData] - information about the files that will be linked (optional)
 * @returns {string} parsed and sanitized HTML
 */
const parseContent = async (content, fileData) =>
    DOMPurify.sanitize(await parseMarkdown(content, fileData));

/**
 * Creates a download path for a file. This path correspond to the download endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @param {{minio_file_name: string, file_name: string, bucket_name: string}} file - file information
 * @returns {string} download link
 */
const createDownloadPath = (file) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const { minio_file_name, bucket_name } = file;
    const queryParams = QueryString.stringify({
        bucketName: bucket_name,
        minioFileName: minio_file_name,
    });
    return `${apiBaseUrl}/file-transfer/download?${queryParams}`;
};

/**
 * Prepends links to the top of the markdown content. This will not be visible in the preview.
 * These links correspond to the backend API download endpoints. (e.g. `http://localhost:8000/file-transfer/download?...`)
 *
 * @param {string} mdContent - markdown content
 * @param {Array<{minio_file_name: string, file_name: string, bucket_name: string}>} fileData - file data
 * @returns {string} markdown content with links prepended
 */
const prependLinks = (mdContent, fileData) => {
    const mdLinks = fileData
        .map((file) => {
            const apiDownloadPath = createDownloadPath(file);

            return `[${file.minio_file_name}]: ${apiDownloadPath} "${file.name}"\n\n`;
        })
        .join('');

    return mdLinks + mdContent;
};

/**
 * Handles link clicks in the Preview component.
 * If the link is local, it will navigate using the provided navigateHandler.
 * If the link is external, it will open in a new tab.
 *
 * Useful information:
 * - All React Router navigation links have a `data-custom-href` attribute with the path they should navigate to.
 *
 * @param {(string) => void} navigateHandler - how to handle local navigate links
 * @returns {(event: MouseEvent) => void} event handler
 */
const handleLinkClick = (navigateHandler) => (event) => {
    const target = event.target;
    if (target.tagName === 'A' && target.href) {
        event.preventDefault();
        if (!URL.canParse(target.href)) return;
        const url = new URL(target.href);
        const navigatePath = target.dataset.customHref;
        if (navigatePath) {
            // Local links to dashboards
            navigateHandler(navigatePath);
        } else {
            // External links
            window.open(target.href, '_blank');
        }
    }
};

export { parseContent, handleLinkClick, createDownloadPath, prependLinks };
