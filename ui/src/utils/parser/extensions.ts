import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import matter from 'gray-matter';
import jsYaml from 'js-yaml';
import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it/index.js';
import { prependLinks } from '../links';

type FileDownload = components['schemas']['FileDownload'];
type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

function createDashboardLink({
    name,
    subtype,
}: {
    name: string;
    subtype: string;
}): string {
    return name && subtype
        ? `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`
        : '/not-found';
}

const LINK_REGEX =
    /^(?:~)?\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\](?:\((?:(\d{2}:\d{2}\s+)?(\d{2}-\d{2}-\d{4}))\))?/;

function ensureCradleLinkRule(md: MarkdownIt): void {
    try {
        md.inline.ruler.at('cradle_link', cradleLinkRule);
    } catch {
        md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);
    }
}

function cradleLinkRule(state: any, silent: boolean): boolean {
    const str = state.src.slice(state.pos);
    const match = LINK_REGEX.exec(str);
    if (!match) return false;
    if (silent) return false;

    const token = state.push('cradle_link', '', 0);
    token.markup = match[0];
    token.hidden = str[0] === '~';
    token.cradle_type = match[1];
    token.cradle_name = match[2];
    token.cradle_alias = match[3];
    token.cradle_time = match[4] ? match[4].trim() : null;
    token.cradle_date = match[5] || null;

    state.pos += match[0].length;
    return true;
}

const SAFE_CSS_COLOR =
    /^(?:var\(--[\w-]+\)|#[\da-fA-F]{3,8}|(?:rgb|hsl)a?\([\d\s,%.]+\)|[a-zA-Z]{1,20})$/;

function safeCssColor(value: string, fallback: string): string {
    return SAFE_CSS_COLOR.test(value) ? value : fallback;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCradleLink(
    entryColors: Map<string, string>,
    token: Token,
    plaintext: boolean = false,
): string {
    const name = (token as any).cradle_name;
    const alias = (token as any).cradle_alias;
    const displayedName = alias || name;

    if (plaintext) {
        return displayedName;
    }

    const type = (token as any).cradle_type;
    const time = (token as any).cradle_time;
    const date = (token as any).cradle_date;
    const url = createDashboardLink({ name, subtype: type });
    const colorClass = safeCssColor(entryColors.get(type) || '', 'var(--foreground)');

    let displayText = escapeHtml(displayedName);

    if (date) {
        displayText += ` (${time ? escapeHtml(time) + ' ' : ''}${escapeHtml(date)})`;
    }

    return `<a style="color: ${colorClass};" href="${url}" data-custom-href="${url}" ${
        date ? `data-timestamp="${escapeHtml(date)}"` : ''
    } ${time ? `data-time="${escapeHtml(time)}"` : ''}>${displayText}</a>`;
}

let DownloadLinkPromiseCache: Record<string, Promise<FileDownload>> = {};
const MinioCache: Record<string, FileDownload> = {};

function fetchMinioDownloadLink(fileId: string): Promise<FileDownload> {
    if (!DownloadLinkPromiseCache[fileId]) {
        DownloadLinkPromiseCache[fileId] = fetchClient
            .GET('/file-transfer/download/', {
                params: { query: { file_id: fileId } },
            })
            .then(({ data, error, response }) => {
                if (error) throw { response, error };
                return {
                    presigned_url: data!.presigned_url,
                    expires_in: Date.now() + data!.expires_in,
                } satisfies FileDownload;
            });
    }
    return DownloadLinkPromiseCache[fileId];
}

async function resolveMinioLinks(token: Token): Promise<void> {
    if (token.type === 'link_open' || token.type === 'image') {
        let hrefIndex = token.attrIndex('href');
        hrefIndex = hrefIndex < 0 ? token.attrIndex('src') : hrefIndex;
        if (hrefIndex < 0) return;
        const href = token.attrs![hrefIndex][1];
        if (!href.includes('/file-transfer/download/')) return;

        let url: URL;
        try {
            url = new URL(href, window.location.origin);
        } catch {
            return;
        }

        const params = new URLSearchParams(url.search);
        const fileId = params.get('file_id');
        if (!fileId) return;

        const cached = MinioCache[fileId];
        let presigned: string | undefined = cached?.presigned_url;
        let expiry: number | undefined = cached?.expires_in;
        if (!presigned || Date.now() > (expiry || 0)) {
            const result = await fetchMinioDownloadLink(fileId);
            presigned = result.presigned_url;
            expiry = result.expires_in;
            MinioCache[fileId] = result;
        }
        token.attrs![hrefIndex][1] = presigned!;
    }
}

async function processTokens(tokens: Token[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const token of tokens) {
        promises.push(resolveMinioLinks(token));
        if (token.children) {
            promises.push(processTokens(token.children));
        }
    }
    await Promise.all(promises);
}

export async function parseWithExtensions(
    md: MarkdownIt,
    mdContent: string,
    fileData: FileReferenceWithNote[] | undefined,
    entryColors: Map<string, string>,
    baseURL: string,
): Promise<{ html: string; metadata: Record<string, any> }> {
    DownloadLinkPromiseCache = {};
    ensureCradleLinkRule(md);
    md.renderer.rules.cradle_link = (tokens: Token[], idx: number) =>
        renderCradleLink(entryColors, tokens[idx]);

    // Override image renderer to add max-width constraint (matching RichEditor behavior)
    md.renderer.rules.image = (tokens: Token[], idx: number) => {
        const token = tokens[idx];
        const src = token.attrGet('src') || '';
        const alt = token.attrGet('alt') || '';
        const title = token.attrGet('title') || '';

        let attrs = `src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"`;
        if (title) {
            attrs += ` title="${escapeHtml(title)}"`;
        }

        // Add max-width styling to match RichEditor (40% max-width)
        attrs += ' style="max-width: 40%; cursor: default;"';

        return `<img ${attrs}>`;
    };

    let metadata = {};
    try {
        const note = matter(mdContent, {
            engines: {
                yaml: (data) => {
                    try {
                        return jsYaml.load(data) as Record<string, any>;
                    } catch {
                        return {};
                    }
                },
            },
        });
        mdContent = note.content;
        metadata = note.data;
    } catch {
        metadata = {};
    }

    // Preprocess to preserve multiple consecutive empty lines
    // Replace patterns of 3+ consecutive newlines (representing 2+ empty lines)
    // with a pattern that markdown-it will preserve as separate paragraphs
    // We use a zero-width space (\u200B) which is invisible but counts as content
    const preprocessedContent = mdContent.replace(/\n\n\n+/g, (match) => {
        // Count how many empty lines we have (number of newlines - 2)
        // e.g., \n\n\n = 3 newlines = 1 empty line, \n\n\n\n = 4 newlines = 2 empty lines
        const emptyLineCount = match.length - 2;
        // Replace with that many empty line markers, each as a separate paragraph
        // Each empty line becomes: \n\n\u200B\n\n (paragraph with zero-width space)
        // We need to preserve the initial \n\n and then add \u200B\n\n for each empty line
        return '\n\n' + '\u200B\n\n'.repeat(emptyLineCount);
    });

    const content = fileData
        ? prependLinks(preprocessedContent, fileData, baseURL)
        : preprocessedContent;
    const env = { metadata };
    const tokens = md.parse(content, env);
    await processTokens(tokens);
    let html = md.renderer.render(tokens, md.options, env);

    // Post-process HTML to convert zero-width space paragraphs to <br> tags
    // This handles paragraphs that only contain zero-width spaces (our empty line markers)
    html = html.replace(/<p>\s*\u200B\s*<\/p>/g, '<p><br></p>');

    return { html, metadata };
}

export function parseWithExtensionsInline(md: MarkdownIt, mdContent: string): string {
    ensureCradleLinkRule(md);

    try {
        mdContent = matter(mdContent).content;
    } catch {
        // ignore invalid frontmatter
    }

    const tokens = md.parse(mdContent, {});
    const plainText = extractPlainText(tokens);

    // Clean up whitespace and return
    return plainText.trim().replace(/\s+/g, ' ');
}

function extractPlainText(tokens: Token[]): string {
    let text = '';

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // For inline tokens, extract their content
        if (token.type === 'inline' && token.children) {
            const inlineText = extractInlineText(token.children);
            if (inlineText) {
                if (text && !text.endsWith(' ')) {
                    text += ' ';
                }
                text += inlineText;
            }
        }
        // For block tokens that might have inline content
        else if (token.children && token.children.length > 0) {
            const childText = extractPlainText(token.children);
            if (childText) {
                if (text && !text.endsWith(' ')) {
                    text += ' ';
                }
                text += childText;
            }
        }
    }

    return text;
}

function extractInlineText(tokens: Token[]): string {
    let text = '';

    for (const token of tokens) {
        switch (token.type) {
            case 'text':
            case 'code_inline':
            case 'reference_link':
            case 'footnote_ref':
                text += token.content;
                break;
            case 'image': {
                const alt = token.attrGet('alt');
                if (alt) {
                    text += alt;
                }
                break;
            }
            case 'softbreak':
            case 'hardbreak':
                text += ' ';
                break;
            case 'link_open':
            case 'link_close':
            case 'strong_open':
            case 'strong_close':
            case 'em_open':
            case 'em_close':
            case 's_open':
            case 's_close':
            case 'html_inline':
                break;
            case 'cradle_link':
                text += (token as any).cradle_alias || (token as any).cradle_name || '';
                break;
            default:
                if (token.content) {
                    text += token.content;
                }
                break;
        }

        // Recursively process children if any
        if (token.children && token.children.length > 0) {
            text += extractInlineText(token.children);
        }
    }

    return text;
}
