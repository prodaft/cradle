import axios from 'axios';
import MarkdownIt from 'markdown-it';
import inject_line_numbers_plugin from 'markdown-it-inject-linenumbers';

import { parseWithExtensions } from './markdownExtensions';

let EntryClassesCached: any = null;

async function getEntryClasses(nonCached = false): Promise<any> {
    if (!nonCached && EntryClassesCached) return EntryClassesCached;
    try {
        const response = await axios.get('/entries/entry_classes/');
        EntryClassesCached = response;
        return response;
    } catch (err) {
        EntryClassesCached = null;
        throw err;
    }
}

self.addEventListener('message', async (event) => {
    const { markdown, fileData, token, apiBaseUrl } = event.data;
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (apiBaseUrl) axios.defaults.baseURL = apiBaseUrl;
    if (markdown != '' && !markdown) {
        self.postMessage({ success: false, error: 'No markdown content provided' });
        return;
    }
    try {
        const response = await getEntryClasses();
        if (response.status === 200) {
            const entryColors = new Map<string, string>();
            for (const entry of response.data) {
                entryColors.set(entry.subtype, entry.color);
            }

            const md = new MarkdownIt({
                html: true,
            });
            md.use(inject_line_numbers_plugin);
            const result = await parseWithExtensions(
                md,
                markdown,
                fileData,
                entryColors,
                axios,
            );
            self.postMessage({
                success: true,
                html: result.html,
                metadata: result.metadata,
            });
        }
    } catch (error: any) {
        if (error.code === 'ERR_NETWORK') {
            self.postMessage({ success: false, error: 'Network error' });
            return;
        }
        if (error.response && error.response.status === 401) {
            self.postMessage({ success: false, error: 'Unauthorized' });
            return;
        }
        self.postMessage({ success: false, error: error.message || String(error) });
    }
});
