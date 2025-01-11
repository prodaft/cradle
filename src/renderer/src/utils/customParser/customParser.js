import Prism from 'prismjs';
import { markedHighlight } from 'marked-highlight';
import { Marked } from 'marked';
import 'prismjs/themes/prism-tomorrow.css';
import { entryMarkdownColors } from '../entryDefinitions/entryDefinitions';
import { createDashboardLink } from '../dashboardUtils/dashboardUtils';
import { prependLinks } from '../textEditorUtils/textEditorUtils';
import { getDownloadLink } from '../../services/fileUploadService/fileUploadService';
import { getEntryClasses } from '../../services/adminService/adminService';

const LINK_REGEX =
    /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/;

let DownloadLinkPromiseCache = {};
let MinioCache = {};

// Currently, the default configuration is being used
// Documentation: https://github.com/markedjs/marked
const marked = new Marked(
    markedHighlight({
        highlight(code, lang) {
            const language = Prism.languages[lang] ? lang : 'plaintext';
            return Prism.highlight(code, Prism.languages[language], language);
        },
    }),
);

const cradleLinkExtension = {
    name: 'cradlelink',
    level: 'inline',
    start(src) {
        return src.match(LINK_REGEX)?.index;
    },
    tokenizer(src, tokens) {
        const match = src.match(LINK_REGEX);
        if (match) {
            return {
                type: 'cradlelink',
                raw: match[0],
                text: match[0].trim(),
                cradle_type: match[1],
                cradle_name: match[2],
                cradle_alias: match[3],
            };
        }

        return false;
    },
    renderer(token) {
        return token.html;
    },
};

async function renderCradleLink(entityClasses, token) {
    if (token.type !== 'cradlelink') {
        return false;
    }

    let type = token.cradle_type;
    let name = token.cradle_name;
    let alias = token.cradle_alias;

    // TODO: Dynamic entity subtypes
    // if (entitySubtypes.has(type)) {
    if (entityClasses.has(type)) {
        const url = createDashboardLink({
            name: name,
            type: 'entity',
            subtype: type,
        });
        // If an alias is provided, use it as the displayed name
        const displayedName = alias ? alias : name;
        token.html = `<a class="${entryMarkdownColors.entities}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
    } else {
        const url = createDashboardLink({
            name: name,
            type: 'artifact',
            subtype: type,
        });
        // If an alias is provided, use it as the displayed name
        const displayedName = alias ? alias : name;
        token.html = `<a class="${entryMarkdownColors.artifacts}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
    }

    return true;
}

function fetchMinioDownloadLink(href) {
    if (!DownloadLinkPromiseCache[href]) {
        DownloadLinkPromiseCache[href] = getDownloadLink(href).then((response) => {
            const presigned = response.data.presigned;
            const expiry = response.data.expiry;
            return { presigned, expiry };
        });
    }

    return DownloadLinkPromiseCache[href];
}

// Define a custom extension that resolves all local links to `/file-transfer/download` to their respective Minio links.
// This also works for images. These are shown in the preview if the ref is valid.
// These links are cached.
async function resolveMinioLinks(token) {
    if ((token.type === 'link' || token.type === 'image') && URL.canParse(token.href)) {
        const url = new URL(token.href);
        const apiBaseUrl = new URL(import.meta.env.VITE_API_BASE_URL);

        const apiBaseOrigin = apiBaseUrl.origin;
        const apiBasePath = apiBaseUrl.pathname.endsWith('/')
            ? apiBaseUrl.pathname.slice(0, -1)
            : apiBaseUrl.pathname;

        if (
            url.origin === apiBaseOrigin &&
            url.pathname === `${apiBasePath}/file-transfer/download/`
        ) {
            const apiDownloadPath = url.href;

            // Null-safe operations
            let presigned = MinioCache[apiDownloadPath]?.presigned;
            let expiry = MinioCache[apiDownloadPath]?.expiry;

            if (!presigned || Date.now() > expiry) {
                try {
                    const result = await fetchMinioDownloadLink(url.href);
                    presigned = result.presigned;
                    expiry = result.expiry;
                    MinioCache[apiDownloadPath] = { presigned, expiry };
                } catch {
                    throw new Error(
                        'There was an error when parsing token ' + token.text,
                    );
                }
            }

            token.href = presigned;
        }
    }
}

function walkTokens(entityClasses) {
    return async (token) => {
        if (!(await renderCradleLink(entityClasses, token)))
            await resolveMinioLinks(token);
    };
}

/**
 * Parses markdown content into HTML. If fileData is provided, links will be prepended to the content.
 * This function does not sanitize the output.
 *
 * @param {string} mdContent - markdown content
 * @param {Array<FileData>} [fileData] - information about the files that will be linked (optional)
 * @returns {string} parsed HTML
 */
const parseMarkdown = async (mdContent, fileData) => {
    DownloadLinkPromiseCache = {};
    try {
        let response = await getEntryClasses();

        if (response.status === 200) {
            let entryClasses = response.data;
            let entityClasses = new Set(
                entryClasses
                    .filter((entry) => entry.type === 'entity')
                    .map((entry) => entry.subtype),
            );

            marked.use({
                walkTokens: walkTokens(entityClasses),
                async: true,
                extensions: [cradleLinkExtension],
            });
            const content = fileData ? prependLinks(mdContent, fileData) : mdContent;
            return marked.parse(content);
        }
    } catch (error) {
        // If 401, or network error, ignore. Otherwise, throw error.

        if (error.code === 'ERR_NETWORK') {
            return;
        }

        if (error.response.status === 401) {
            return;
        }
        throw error;
    }
};

export default parseMarkdown;
