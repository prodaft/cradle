import { EntriesApi, FileTransferApi } from '@services/cradle/apis';
import MarkdownIt from 'markdown-it';
import Prism from 'prismjs';
import { parseWithExtensions, parseWithExtensionsInline } from './extensions';

export async function parseMarkdown(
    mdContent: string,
    entriesApi: EntriesApi,
    fileTransferApi: FileTransferApi,
    baseURL: string,
    fileData?: any[],
    addLinks = false,
): Promise<{ html: string; metadata: Record<string, any> } | undefined> {
    try {
        const entries = await entriesApi.entryClassesList({});
        const entryColors = new Map<string, string>();
        for (const entry of entries) {
            entryColors.set(entry.subtype, entry.color || 'hsl(var(--primary))');
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
