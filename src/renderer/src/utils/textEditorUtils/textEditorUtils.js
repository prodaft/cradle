import DOMPurify from 'dompurify';
import parseMarkdown from '../customParser/customParser';
import QueryString from 'qs';
import { syntaxTree } from '@codemirror/language';

/**
 * Parses markdown content into HTML using a custom marked.js parser
 * Sanitizing is recommended by the marked documentation: https://github.com/markedjs/marked?tab=readme-ov-file#usage
 *
 * @function parseContent
 * @param {string} content - Markdown syntax
 * @param {Array<FileData>} [fileData] - information about the files that will be linked
 * @returns {string} parsed and sanitized HTML
 */
const parseContent = async (content, fileData) =>
    DOMPurify.sanitize(await parseMarkdown(content, fileData));

/**
 * Creates a download path for a file. This path correspond to the download endpoint in the backend.
 * The base URL (e.g. `http://localhost:8000`) is the same as the backend API's.
 *
 * @function createDownloadPath
 * @param {FileData} file - file information
 * @returns {string} download link
 */
const createDownloadPath = (file) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const { minio_file_name, bucket_name } = file;
    const queryParams = QueryString.stringify({
        bucketName: bucket_name,
        minioFileName: minio_file_name,
    });
    return `${apiBaseUrl}/file-transfer/download/?${queryParams}`;
};

/**
 * Prepends links to the top of the markdown content. This will not be visible in the preview.
 * These links correspond to the backend API download endpoints. (e.g. `http://localhost:8000/file-transfer/download/?...`)
 *
 * @function prependLinks
 * @param {string} mdContent - markdown content
 * @param {Array<FileData>} fileData - file data
 * @returns {string} markdown content with links prepended
 */
const prependLinks = (mdContent, fileData) => {
    const mdLinks = fileData
        .map((file) => {
            const apiDownloadPath = createDownloadPath(file);

            return `[${file.minio_file_name}]: ${apiDownloadPath} "${file.file_name}"\n\n`;
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
 * @function handleLinkClick
 * @param {NavigateFunction} navigateHandler - how to handle local navigate links
 * @returns {Function} event handler
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

const LINK_REGEX_SINGLE = /^\[(?:([^:|]+)(?::(?:((?:\\\||[^|])+))?(?:\|((?:\\\||[^|])+))?)?)?\]$/;
const LINK_REGEX_DOUBLE = /^\[\[(?:([^:|]+)(?::(?:((?:\\\||[^|])+))?(?:\|((?:\\\||[^|])+))?)?)?\]\]$/;
const LINK_REGEX = LINK_REGEX_DOUBLE;

/**
 * Gets the link node from the current position in the editor.
 * This function is used to determine if the current position is inside a link.
 * If the current position is inside a link, the link node is returned.
 * Otherwise, null is returned.
 *
 * @param {EditorState} context - the editor state. See `@codemirror/state`
 * @returns {?Node} the link node or null
 */
const getLinkNode = (context) => {
    const pos = context.pos;
    const tree = syntaxTree(context.state);
    let node = tree.resolve(pos, -1);

    // Traverse the tree to check if the node or its parents are a link
    while (node) {
        if (node.type.name === 'Link') {
            return node;
        }
        node = node.parent;
    }
    return null;
};

/**
 * The custom syntax used to reference links to dashboards in the editor. The syntax is `[[type:name|alias]]`.
 * This object holds information about where this link is located in the text.
 * @typedef {Object} Link
 * @property {number} from - the starting position of the link
 * @property {number} to - the ending position of the link
 * @property {string} type - the type of the link
 * @property {string} text - the text of the link
 */

/**
 * Parses a link from the text.
 * This function is used to determine if the current position is inside a link.
 * If the current position is inside a link, the link is returned.
 * Otherwise, null is returned.
 *
 * @param {number} from - the starting position of the text
 * @param {number} current - the current position in the text
 * @param {string} text - the text to parse
 * @returns {?Link}
 */
const parseLink = (from, current, text) => {
    // This is very bad
    const match = text == "[[]]" ? LINK_REGEX_DOUBLE.exec(text) : LINK_REGEX_SINGLE.exec(text);

    if (!match) return null;

    // `alias` cannot have suggestions
    const [_, type, name] = match;

    // Extract group positions
    const typeStart = text == "[[]]" ? match.index + 2 + from : match.index + 1 + from;
    const typeEnd = type ? typeStart + type.length : typeStart;

    const nameStart = typeEnd + 1;
    const nameEnd = name ? nameStart + name.length : nameStart;

    if (current >= typeStart && current <= typeEnd)
        return {
            from: typeStart,
            to: typeEnd,
            type: null,
            text: text.slice(typeStart - from, typeEnd - from),
            post: (t) => `${t}:`,
        };
    else if (nameStart && current >= nameStart && current <= nameEnd)
        return {
            from: nameStart,
            to: nameEnd,
            type: text.slice(typeStart - from, typeEnd - from),
            text: text.slice(nameStart - from, nameEnd - from),
            post: (t) => `${t}`,
        };

    return null;
};

export {
    parseContent,
    handleLinkClick,
    createDownloadPath,
    prependLinks,
    getLinkNode,
    parseLink,
};
