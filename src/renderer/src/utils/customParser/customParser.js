import Prism from 'prismjs';
import { markedHighlight } from 'marked-highlight';
import { Marked } from 'marked';
import 'prismjs/themes/prism-tomorrow.css';
import {
    entryMarkdownColors,
} from '../entryDefinitions/entryDefinitions';
import { createDashboardLink } from '../dashboardUtils/dashboardUtils';
import { prependLinks } from '../textEditorUtils/textEditorUtils';
import { getDownloadLink } from '../../services/fileUploadService/fileUploadService';
import { getEntryClasses } from '../../services/adminService/adminService';

const LINK_REGEX = /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/

function handle_link(text, entityClasses) {
        return text.replace(LINK_REGEX, (matched, type, name, alias) => {
            // TODO: Dynamic entity subtypes
            // if (entitySubtypes.has(type)) {
            if (entityClasses.includes(type)) {
                const url = createDashboardLink({ name: name, type: 'entity', subtype: type });
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<a class="${entryMarkdownColors.entities}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
            } else {
                const url = createDashboardLink({
                    name: name,
                    type: 'artifact',
                    subtype: type,
                });
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<a class="${entryMarkdownColors.artifacts}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
            }
        });
}

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

const cradleLinkExtension = (entryClasses) => {
  let entity_class_subtypes = entryClasses.filter((entry) => entry.type === 'entity').map((entry) => entry.subtype);

  return {
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

        console.log(entity_class_subtypes);
        text = handle_link(text, entity_class_subtypes)

        return text;
    },
  }
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

await getEntryClasses().then((response) => {
  if (response.status === 200) {
    let types = response.data;
      marked.use({ ...resolveMinioLinks, extensions: [cradleLinkExtension(types)] });
  }
}).catch((error) => {
  console.log(error)
  // If 401, or network error, ignore. Otherwise, throw error.

    if (error.code === "ERR_NETWORK") {
      return;
    }

    if (error.response.status === 401) {
      return;
    }
    throw error;
})

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
