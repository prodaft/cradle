import Prism from 'prismjs';
import { markedHighlight } from 'marked-highlight';
import { Marked } from 'marked';
import 'prismjs/themes/prism-tomorrow.css';
import {
    entityMarkdownColors,
    entrySubtypes,
    metadataSubtypes,
} from '../entityDefinitions/entityDefinitions';
import { createDashboardLink } from '../dashboardUtils/dashboardUtils';
import { prependLinks } from '../textEditorUtils/textEditorUtils';
import { getDownloadLink } from '../../services/fileUploadService/fileUploadService';

const regexes = {
    cradleLink:
        /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/,
    actors: /\[\[actor:((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/g, // [[actor:name(|alias)]]
    cases: /\[\[case:((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/g, // [[case:name(|alias)]]
    entries:
        /\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/g, // [[entry-type:name(|alias)]]
    metadata:
        /\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/g, // [[metadata-type:name(|alias)]]
};

// TODO handle escaped characters (e.g. '\]' '\|') when parsing. This needs to be done on the backend as well.
const handlers = {
    // Take the user to the actor's dashboard
    actors: (text) => {
        return text.replace(regexes.actors, (_, name, alias) => {
            const url = createDashboardLink({ name: name, type: 'actor' });
            // If an alias is provided, use it as the displayed name
            const displayedName = alias ? alias : name;
            return `<a class="${entityMarkdownColors.actors}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
        });
    },
    // Take the user to the case's dashboard
    cases: (text) => {
        return text.replace(regexes.cases, (_, name, alias) => {
            const url = createDashboardLink({ name: name, type: 'case' });
            // If an alias is provided, use it as the displayed name
            const displayedName = alias ? alias : name;
            return `<a class="${entityMarkdownColors.cases}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
        });
    },
    // Take the user to the entry's dashboard
    entries: (text) => {
        return text.replace(regexes.entries, (matched, type, name, alias) => {
            if (entrySubtypes.has(type)) {
                const url = createDashboardLink({
                    name: name,
                    type: 'entry',
                    subtype: type,
                });
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<a class="${entityMarkdownColors.entries}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
            }

            return matched;
        });
    },
    // Metadata does not have a dashboard. Here just highlight the text
    metadata: (text) => {
        return text.replace(regexes.metadata, (matched, type, name, alias) => {
            if (metadataSubtypes.has(type)) {
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<span class="${entityMarkdownColors.metadata}">${displayedName}</span>`;
            }

            return matched;
        });
    },
};

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
        return src.match(regexes.cradleLink)?.index;
    },
    tokenizer(src, tokens) {
        const match = src.match(regexes.cradleLink);
        if (match) {
            return {
                type: 'cradlelink',
                raw: match[0],
                text: match[0].trim(),
            };
        }

        return false;
    },
    renderer(token) {
        if (token.type !== 'cradlelink') {
            return false;
        }

        // Loop through all type handlers and call them on the text
        var text = token.raw;

        Object.keys(handlers).forEach((key) => {
            const handler = handlers[key];
            text = handler(text);
        });

        return text;
    },
};

// Define a custom extension that resolves all local links to `/file-transfer/download` to their respective Minio links.
// This also works for images. These are shown in the preview if the ref is valid.
// These links are cached.
const resolveMinioLinks = {
    async: true,
    async walkTokens(token) {
        if (
            (token.type === 'link' || token.type === 'image') &&
            URL.canParse(token.href)
        ) {
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
                const minioCache =
                    JSON.parse(localStorage.getItem('minio-cache')) || {};

                const fetchMinioDownloadLink = async () => {
                    const response = await getDownloadLink(url.href);
                    const presigned = response.data.presigned;
                    const expiry = Date.now() + 1000 * 60 * 5; // 5 minutes
                    return { presigned, expiry };
                };

                // Null-safe operations
                let presigned = minioCache[apiDownloadPath]?.presigned;
                let expiry = minioCache[apiDownloadPath]?.expiry;

                if (!presigned || Date.now() > expiry) {
                    try {
                        const result = await fetchMinioDownloadLink();
                        presigned = result.presigned;
                        expiry = result.expiry;
                        minioCache[apiDownloadPath] = { presigned, expiry };
                        localStorage.setItem('minio-cache', JSON.stringify(minioCache));
                    } catch {
                        throw new Error(
                            'There was an error when parsing token ' + token.text,
                        );
                    }
                }

                token.href = presigned;
            }
        }
    },
};

marked.use({ ...resolveMinioLinks, extensions: [cradleLinkExtension] });

/**
 * Parses markdown content into HTML. If fileData is provided, links will be prepended to the content.
 * This function does not sanitize the output.
 *
 * @param {string} mdContent - markdown content
 * @param {Array<FileData>} [fileData] - information about the files that will be linked (optional)
 * @returns {string} parsed HTML
 */
const parseMarkdown = async (mdContent, fileData) => {
    const content = fileData ? prependLinks(mdContent, fileData) : mdContent;
    return marked.parse(content);
};

export default parseMarkdown;
