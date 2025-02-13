// markdownWorker.js
//
// This file implements a markdown parser as a Web Worker. It is entirely
// decoupled from the rest of your frontend by inlining all the required
// functions and constants. All HTTP requests are done via an Axios instance,
// and both the auth token and API base URL are passed from the main thread.


import './prism-config.js'
import axios from 'axios';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import Prism from 'prismjs';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-python.js';
import QueryString from 'qs';


const entryMarkdownColors = {
  entities: 'text-[#744abf]',
  artifacts: 'text-[#e66100]',
};

function createDashboardLink(entry) {
  if (!entry) return '/not-found';
  const { name, subtype } = entry;
  if (!name || !subtype) return '/not-found';
  return `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`;
}

const createDownloadPath = (file) => {
    const apiBaseUrl = axios.defaults.baseURL;
    const { minio_file_name, bucket_name } = file;
    const queryParams = QueryString.stringify({
        bucketName: bucket_name,
        minioFileName: minio_file_name,
    });
    return `${apiBaseUrl}/file-transfer/download/?${queryParams}`;
};

function prependLinks(mdContent, fileData) {
  const mdLinks = fileData
    .map((file) => {
      const apiDownloadPath = createDownloadPath(file);
      return `[${file.minio_file_name}]: ${apiDownloadPath} "${file.file_name}"\n\n`;
    })
    .join('');
  return mdLinks + mdContent;
}

let EntryClassesCached = null;

/**
 * Get the available entry classes from the backend.
 * Uses caching unless nonCached is set to true.
 */
async function getEntryClasses(nonCached = false) {
  if (!nonCached && EntryClassesCached) {
    return EntryClassesCached;
  } else {
    EntryClassesCached = axios({
      method: 'get',
      url: '/entries/entry_classes/',
    })
      .then((response) => {
        EntryClassesCached = new Promise((resolve) =>
          resolve(JSON.parse(JSON.stringify(response)))
        );
        return response;
      })
      .catch((err) => {
        EntryClassesCached = null; // Clear cache on error.
        throw err;
      });
    return EntryClassesCached;
  }
}

function canParseURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

const LINK_REGEX =
  /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/;

let DownloadLinkPromiseCache = {};
let MinioCache = {};

const marked = new Marked(
  markedHighlight({
    highlight(code, lang) {
      const language = Prism.languages[lang] ? lang : 'plaintext';
      return Prism.highlight(code, Prism.languages[language], language);
    },
  })
);

const cradleLinkExtension = {
  name: 'cradlelink',
  level: 'inline',
  start(src) {
    const m = src.match(LINK_REGEX);
    return m ? m.index : undefined;
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
  if (token.type !== 'cradlelink') return false;

  const type = token.cradle_type;
  const name = token.cradle_name;
  const alias = token.cradle_alias;

  if (entityClasses.has(type)) {
    const url = createDashboardLink({
      name: name,
      type: 'entity',
      subtype: type,
    });
    const displayedName = alias ? alias : name;
    token.html = `<a class="${entryMarkdownColors.entities}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
  } else {
    const url = createDashboardLink({
      name: name,
      type: 'artifact',
      subtype: type,
    });
    const displayedName = alias ? alias : name;
    token.html = `<a class="${entryMarkdownColors.artifacts}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
  }
  return true;
}

async function resolveMinioLinks(token) {
  if (
    (token.type === 'link' || token.type === 'image') &&
    canParseURL(token.href)
  ) {
    const url = new URL(token.href);

    const baseUrlStr = axios.defaults.baseURL || '';
    if (!baseUrlStr) return;
    const apiBaseUrl = new URL(baseUrlStr);
    let apiBasePath = apiBaseUrl.pathname;
    if (apiBasePath.endsWith('/')) {
      apiBasePath = apiBasePath.slice(0, -1);
    }
    if (
      url.origin === apiBaseUrl.origin &&
      url.pathname === `${apiBasePath}/file-transfer/download/`
    ) {
      const apiDownloadPath = url.href;
      let presigned = MinioCache[apiDownloadPath]?.presigned;
      let expiry = MinioCache[apiDownloadPath]?.expiry;
      if (!presigned || Date.now() > expiry) {
        try {
          const result = await fetchMinioDownloadLink(url.href);
          presigned = result.presigned;
          expiry = result.expiry;
          MinioCache[apiDownloadPath] = { presigned, expiry };
        } catch (error) {
          throw new Error(error + '. There was an error when parsing token ' + token.text);
        }
      }
      token.href = presigned;
    }
  }
}

function walkTokens(entityClasses) {
  return async (token) => {
    if (!(await renderCradleLink(entityClasses, token))) {
      await resolveMinioLinks(token);
    }
  };
}

/**
 * Parse markdown content into HTML.
 *
 * If fileData is provided, file download links are prepended to the content.
 *
 * @param {string} mdContent - The markdown content.
 * @param {Array} [fileData] - Optional file data to prepend as links.
 * @returns {Promise<string>} The resulting HTML.
 */
async function parseMarkdown(mdContent, fileData) {
  // Reset caches for each new parse.
  DownloadLinkPromiseCache = {};
  try {
    const response = await getEntryClasses();
    if (response.status === 200) {
      const entryClasses = response.data;
      const entityClasses = new Set(
        entryClasses
          .filter((entry) => entry.type === 'entity')
          .map((entry) => entry.subtype)
      );
      marked.use({
        walkTokens: walkTokens(entityClasses),
        async: true,
        extensions: [cradleLinkExtension],
      });
      const content = fileData ? prependLinks(mdContent, fileData) : mdContent;
      return await marked.parse(content);
    }
  } catch (error) {
    // If network errors or unauthorized responses occur, return nothing.
    if (error.code === 'ERR_NETWORK') return;
    if (error.response && error.response.status === 401) return;
    throw error;
  }
}

const getDownloadLink = (path) => {
    return axios({
        url: path,
        method: 'GET',
    });
};

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

self.addEventListener('message', async (event) => {
  const { markdown, fileData, token, apiBaseUrl } = event.data;

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
  }

  if (!markdown) {
    self.postMessage({ success: false, error: 'No markdown content provided' });
    return;
  }

  try {
    const html = await parseMarkdown(markdown, fileData);

    self.postMessage({ success: true, html });
  } catch (error) {
    self.postMessage({ success: false, error: error.message || String(error) });
  }
});
