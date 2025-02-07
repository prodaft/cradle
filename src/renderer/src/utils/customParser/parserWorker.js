// markdownWorker.js
//
// This file implements a markdown parser as a Web Worker. It is entirely
// decoupled from the rest of your frontend by inlining all the required
// functions and constants. All HTTP requests are done via an Axios instance,
// and both the auth token and API base URL are passed from the main thread.


import axios from 'axios';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

// ─── UTILITY CONSTANTS AND FUNCTIONS ─────────────────────────────

// The markdown CSS classes to style links for different entry types.
const entryMarkdownColors = {
  entities: 'text-[#744abf]',
  artifacts: 'text-[#e66100]',
};

// Create a dashboard link for an entry. If invalid, returns '/not-found'.
function createDashboardLink(entry) {
  if (!entry) return '/not-found';
  const { name, subtype } = entry;
  if (!name || !subtype) return '/not-found';
  return `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`;
}

// A helper to build a download URL for a given file object.
// Adjust this implementation to match your file object structure.
function createDownloadPath(file) {
  // If the file already includes a downloadUrl, use it.
  if (file.downloadUrl) return file.downloadUrl;
  // Otherwise, default to a simple URL using an id or minio_file_name.
  return `/file-transfer/download/?id=${encodeURIComponent(
    file.id || file.minio_file_name
  )}`;
}

// Prepend file-data links to the markdown. These links won’t be visible in the preview.
function prependLinks(mdContent, fileData) {
  const mdLinks = fileData
    .map((file) => {
      const apiDownloadPath = createDownloadPath(file);
      return `[${file.minio_file_name}]: ${apiDownloadPath} "${file.file_name}"\n\n`;
    })
    .join('');
  return mdLinks + mdContent;
}

// Make a GET request to the download endpoint.
function getDownloadLink(path) {
  return axios({ url: path, method: 'GET' });
}

// Cache for entry classes (fetched from the backend).
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
        // Cache a deep clone so that later mutations won’t affect the cached value.
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

// A simple helper to check whether a string can be parsed as a URL.
function canParseURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

// ─── MARKED AND CUSTOM EXTENSIONS ────────────────────────────────

// Regular expression to match our custom "cradle link" syntax.
// Example: [[entity:SomeName|Alias]]
const LINK_REGEX =
  /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/;

// Initialize caches for download links and Minio links.
let DownloadLinkPromiseCache = {};
let MinioCache = {};

// Initialize Marked with Prism syntax highlighting.
const marked = new Marked(
  // markedHighlight({
  //   highlight(code, lang) {
  //     const language = Prism.languages[lang] ? lang : 'plaintext';
  //     return Prism.highlight(code, Prism.languages[language], language);
  //   },
  // })
);

// Custom extension to tokenize cradle links.
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

// For a token representing a cradle link, convert it into an HTML link.
async function renderCradleLink(entityClasses, token) {
  if (token.type !== 'cradlelink') return false;

  const type = token.cradle_type;
  const name = token.cradle_name;
  const alias = token.cradle_alias;

  if (entityClasses.has(type)) {
    // If the type is among known entity types, build an "entity" link.
    const url = createDashboardLink({
      name: name,
      type: 'entity',
      subtype: type,
    });
    const displayedName = alias ? alias : name;
    token.html = `<a class="${entryMarkdownColors.entities}" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
  } else {
    // Otherwise, assume it is an artifact.
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

// For links (or images) that point to our file-transfer endpoint,
// fetch a presigned (Minio) URL and replace the href.
async function resolveMinioLinks(token) {
  if (
    (token.type === 'link' || token.type === 'image') &&
    canParseURL(token.href)
  ) {
    const url = new URL(token.href);
    // Use the worker’s Axios base URL (which should be set from the main thread)
    const baseUrlStr = axios.defaults.baseURL || '';
    if (!baseUrlStr) return; // Nothing to do if no base URL was provided.
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
        } catch {
          throw new Error('There was an error when parsing token ' + token.text);
        }
      }
      token.href = presigned;
    }
  }
}

// Helper: for each token, try to render a cradle link; if not, resolve Minio links.
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

// A mock function that fetches presigned links. Replace with your actual logic if needed.
async function fetchMinioDownloadLink(url) {
  // You may already have something like `getDownloadLink` that does this.
  // This is just a placeholder.
  // E.g., you might do:
  //   const { data } = await axios.get(url);
  //   return data;
  return {
    presigned: url + '&presigned=true',
    expiry: Date.now() + 60_000, // 1 minute from now
  };
}

// ─── NEW: KEEP TRACK OF LATEST JOB ID ─────────────────────────────

let currentJobId = 0; // Tracks the most recent job. Incremented with each message.

// ─── WORKER MESSAGE HANDLING ──────────────────────────────────────
self.addEventListener('message', async (event) => {
  // Each message is a new "job"; increment and capture that job ID locally.
  const jobId = ++currentJobId;

  const { markdown, fileData, token, apiBaseUrl } = event.data;

  // Set up Axios manually.
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
  }

  if (!markdown) {
    // If the job is still the most recent, respond; otherwise do nothing.
    if (jobId === currentJobId) {
      self.postMessage({ success: false, error: 'No markdown content provided' });
    }
    return;
  }

  try {
    const html = await parseMarkdown(markdown, fileData);

    // Only post back if this job is still the newest one.
    self.postMessage({ success: true, html });
  } catch (error) {
    // Only report the error if this job is still the most recent
    if (jobId === currentJobId) {
      self.postMessage({ success: false, error: error.message || String(error) });
    }
  }
});
