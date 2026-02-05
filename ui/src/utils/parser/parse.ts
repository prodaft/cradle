import { HashIcon } from '@phosphor-icons/react';
import { EntriesApi, FileTransferApi } from '@services/cradle/apis';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import Prism from 'prismjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWithExtensions, parseWithExtensionsInline } from './extensions';

const hashIcon = renderToStaticMarkup(createElement(HashIcon, { size: 16 }));

export async function parseMarkdown(
    mdContent: string,
    entriesApi: EntriesApi,
    fileTransferApi: FileTransferApi,
    baseURL: string,
    fileData?: any[],
): Promise<{ html: string; metadata: Record<string, any> } | undefined> {
    try {
        const response = await entriesApi.entryClassesList({});
        const entries = response?.results ?? [];
        const entryColors = new Map<string, string>();
        for (const entry of entries) {
            entryColors.set(entry.subtype, entry.color || 'var(--primary)');
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
        }).use(markdownItAnchor, {
            permalink: markdownItAnchor.permalink.linkInsideHeader({
                symbol: hashIcon,
                placement: 'after',
                ariaHidden: false,
                class: 'header-anchor',
            }),
            slugify: (s: string) =>
                encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-')),
        });

        return await parseWithExtensions(
            md,
            mdContent,
            fileData,
            entryColors,
            fileTransferApi,
            baseURL,
        );
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

export default parseMarkdown;
