import MarkdownIt from 'markdown-it';
import markdownItAnchor from "markdown-it-anchor";
import Prism from 'prismjs';
import { getBaseUrl } from '../../services/configService/configService';

import anchor from 'markdown-it-anchor';
import { getEntryClasses } from '../../services/adminService/adminService';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import { parseWithExtensions, parseWithExtensionsInline } from './markdownExtensions';

const LINK_SVG = `
<svg width="1em" height="1em" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M14 11.9976C14 9.5059 11.683 7 8.85714 7C8.52241 7 7.41904 7.00001 7.14286 7.00001C4.30254 7.00001 2 9.23752 2 11.9976C2 14.376 3.70973 16.3664 6 16.8714C6.36756 16.9525 6.75006 16.9952 7.14286 16.9952" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M10 11.9976C10 14.4893 12.317 16.9952 15.1429 16.9952C15.4776 16.9952 16.581 16.9952 16.8571 16.9952C19.6975 16.9952 22 14.7577 22 11.9976C22 9.6192 20.2903 7.62884 18 7.12383C17.6324 7.04278 17.2499 6.99999 16.8571 6.99999" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>
`

// Custom permalink object that creates proper URLs with fragment routing
const customPermalink = anchor.permalink.linkInsideHeader({
    symbol: `<span class="header-anchor-icon inline-block align-middle text-gray-500 opacity-0 transition-opacity duration-200">${LINK_SVG}</span>`,
    placement: 'after',
    renderHref: (slug: string) => {

        const currentHash = window.location.hash.substring(1).split('?')[0] || ''; 
        const newUrl = window.location.pathname + window.location.search + '#' + currentHash + (currentHash ? '?' : '') + 'heading=' + `${slug}`;
        console.log(window.location.origin + newUrl);
        return window.location.origin + newUrl;
    },
});

export async function parseMarkdown(
    mdContent: string,
    fileData?: any[],
    addLinks = false,
): Promise<{ html: string; metadata: Record<string, any> } | undefined> {
    try {
        const response = await getEntryClasses();
        if (response.status === 200) {
            const entryColors = new Map<string, string>();
            for (const entry of response.data) {
                entryColors.set(entry.subtype, entry.color);
            }

            const md = new MarkdownIt({
                html: true,
                highlight: (code: string, lang: string): string => {
                    if (lang && Prism.languages[lang]) {
                        try {
                            return Prism.highlight(code, Prism.languages[lang], lang);
                        } catch {}
                    }
                    return '';
                },
            });


            return await parseWithExtensions(
                addLinks ? md.use(markdownItAnchor, {
                    permalink: customPermalink
                }) : md,
                mdContent,
                fileData,
                entryColors,
                authAxios,
            );
        }
    } catch (error: any) {
        // Handle network or authorization errors by returning undefined.
        if (
            error.code === 'ERR_NETWORK' ||
            (error.response && error.response.status === 401)
        ) {
            return;
        }
        throw error;
    }
}

export function parseMarkdownInline(mdContent: string | undefined): string | undefined {
    if (!mdContent) return mdContent;
    try {
        const md = new MarkdownIt({
            html: false,
        });

        return parseWithExtensionsInline(md, mdContent);
    } catch (error: any) {
        // Handle network or authorization errors by returning undefined.
        if (
            error.code === 'ERR_NETWORK' ||
            (error.response && error.response.status === 401)
        ) {
            return '';
        }
        throw error;
    }
}

export function parseWorker() {
    // In some React component or service file
    const worker = new Worker(new URL('./parserWorker.ts', import.meta.url), {
        type: 'module',
    });

    worker.postMessage({
        token: localStorage.getItem('access'),
        apiBaseUrl: getBaseUrl(),
    });

    return worker;
}

export default parseMarkdown;
