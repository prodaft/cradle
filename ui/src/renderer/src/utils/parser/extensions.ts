import matter from 'gray-matter';
import jsYaml from 'js-yaml';
import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it/index.js';
import QueryString from 'qs';
import { FileTransferApi } from '@/services/cradle/apis';
import { strip } from '../links';
import { FileDownload, FileReference } from '@/services/cradle';
import { prependLinks } from '../links';

// Override block-level renderer rules to render nothing
const BLOCK_RULES = [
    'paragraph_open',
    'paragraph_close',
    'heading_open',
    'heading_close',
    'blockquote_open',
    'blockquote_close',
    'bullet_list_open',
    'bullet_list_close',
    'ordered_list_open',
    'ordered_list_close',
    'list_item_open',
    'list_item_close',
    'hr',
    'table_open',
    'table_close',
    'thead_open',
    'thead_close',
    'tbody_open',
    'tbody_close',
    'tr_open',
    'tr_close',
    'th_open',
    'th_close',
    'td_open',
    'td_close',
    'code_block',
    'fence',
    'html_block',
];

const INLINE_FORMATTING_RULES = [
    'strong_open',
    'strong_close',
    'em_open',
    'em_close',
    's_open',
    's_close',
    'link_open',
    'link_close',
];

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

export function cradleLinkRule(state: any, silent: boolean): boolean {
    let str = state.src.slice(state.pos);
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

export function renderCradleLink(
    entryColors: Map<string, string>,
    token: Token,
    plaintext: boolean = false,
): string {
    const type = (token as any).cradle_type;
    const name = (token as any).cradle_name;
    const alias = (token as any).cradle_alias;
    const time = (token as any).cradle_time;
    const date = (token as any).cradle_date;
    const hidden = (token as any).hidden;
    const displayedName = alias || name;
    const url = createDashboardLink({ name, subtype: type });
    const colorClass = entryColors.get(type) || '#000000';

    let displayText = displayedName;

    if (plaintext) {
        return displayText;
    }

    if (date) {
        displayText += ` (${time ? time + ' ' : ''}${date})`;
    }

    return `<a style="color: ${colorClass};" href="${url}" data-custom-href="${url}" ${
        date ? `data-timestamp="${date}"` : ''
    } ${time ? `data-time="${time}"` : ''}>${displayText}</a>`;
}

// Match ![....][....] or [....][....]
const FOOTNOTE_REF_REGEX = /^\!?\[(.*)\]\[(.*)\]/;

export function footnoteRefRule(state: any, silent: boolean): boolean {
    const match = FOOTNOTE_REF_REGEX.exec(state.src.slice(state.pos));
    if (!match) return false;
    if (silent) return false;

    const token = state.push('footnote_ref', '', 0);
    token.content = match[1];
    token.footnote_ref = match[2];

    state.pos += match[0].length;
    return true;
}

let DownloadLinkPromiseCache: Record<
    string,
    Promise<FileDownload>
> = {};
let MinioCache: Record<string, FileDownload> = {};

export function fetchMinioDownloadLink(
    fileTransferApi: FileTransferApi,
    bucketName: string,
    minioFileName: string,
): Promise<FileDownload> {
    const cacheKey = `${bucketName}:${minioFileName}`;
    if (!DownloadLinkPromiseCache[cacheKey]) {
        DownloadLinkPromiseCache[cacheKey] = fileTransferApi
            .fileTransferDownloadRetrieve({ bucketName, minioFileName })
            .then((response) => {
                return response;
            });
    }
    return DownloadLinkPromiseCache[cacheKey];
}

export async function resolveMinioLinks(
    token: Token,
    fileTransferApi: FileTransferApi,
    baseURL: string,
): Promise<void> {
    if (token.type === 'link_open' || token.type === 'image') {
        let hrefIndex = token.attrIndex('href');
        hrefIndex = hrefIndex < 0 ? token.attrIndex('src') : hrefIndex;
        if (hrefIndex < 0) return;
        const href = token.attrs![hrefIndex][1];
        try {
            new URL(href);
        } catch {
            return;
        }
        const url = new URL(href);
        if (!baseURL) return;
        const apiBaseUrl = new URL(baseURL);
        const apiBasePath = apiBaseUrl.pathname.replace(/\/$/, '');

        if (
            url.origin === apiBaseUrl.origin &&
            url.pathname === `${apiBasePath}/file-transfer/download/`
        ) {
            const params = new URLSearchParams(url.search);
            const bucketName = params.get('bucketName');
            const minioFileName = params.get('minioFileName');
            if (!bucketName || !minioFileName) return;

            const cacheKey = `${bucketName}:${minioFileName}`;
            let cached = MinioCache[cacheKey];
            let presigned: string | undefined = cached?.presigned;
            let expiry: number | undefined = cached?.expiresAt;
            if (!presigned || Date.now() > (expiry || 0)) {
                const result = await fetchMinioDownloadLink(fileTransferApi, bucketName, minioFileName);
                presigned = result.presigned;
                expiry = result.expiresAt;
                MinioCache[cacheKey] = result;
            }
            token.attrs![hrefIndex][1] = presigned;
        }
    }
}

export async function processTokens(
    tokens: Token[],
    fileTransferApi: FileTransferApi,
    baseURL: string,
): Promise<void> {
    for (const token of tokens) {
        await resolveMinioLinks(token, fileTransferApi, baseURL);
        if (token.children) {
            await processTokens(token.children, fileTransferApi, baseURL);
        }
    }
}

export async function parseWithExtensions(
    md: MarkdownIt,
    mdContent: string,
    fileData: FileReference[] | undefined,
    entryColors: Map<string, string>,
    fileTransferApi: FileTransferApi,
    baseURL: string,
): Promise<{ html: string; metadata: Record<string, any> }> {
    DownloadLinkPromiseCache = {};
    md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);
    md.renderer.rules.cradle_link = (tokens: Token[], idx: number) =>
        renderCradleLink(entryColors, tokens[idx]);

    md.inline.ruler.before('cradle_link', 'footnote_ref', footnoteRefRule);
    md.renderer.rules.footnote_ref = (tokens: Token[], idx: number) =>
        renderFootnoteRef(tokens[idx]); // TODO: Implement this

    let metadata = {};
    try {
        let note = matter(mdContent, {
            engines: {
                yaml: (data) => {
                    try {
                        return jsYaml.load(data) as Record<string, any>;
                    } catch (e) {
                        console.log(e);
                        return {};
                    }
                },
            },
        });
        if (note.content || mdContent.trim().endsWith('---'))
            // If the content ends with '---' or note is not empty, there exists frontmatter
            mdContent = note.content;
        metadata = note.data;
    } catch (error) {
        console.log(error);
        metadata = {};
    }

    const content = fileData
        ? prependLinks(mdContent, fileData, baseURL)
        : mdContent;
    const tokens = md.parse(content, {});
    await processTokens(tokens, fileTransferApi, baseURL);
    const html = md.renderer.render(tokens, md.options, metadata);

    return { html, metadata };
}

export function parseWithExtensionsInline(md: MarkdownIt, mdContent: string): string {
    DownloadLinkPromiseCache = {};

    // Add the cradle link rule
    md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);
    md.inline.ruler.before('cradle_link', 'footnote_ref', footnoteRefRule);

    const originalRules: { [key: string]: any } = {};

    BLOCK_RULES.forEach((rule) => {
        if (md.renderer.rules[rule]) {
            originalRules[rule] = md.renderer.rules[rule];
        }
        md.renderer.rules[rule] = () => '';
    });

    INLINE_FORMATTING_RULES.forEach((rule) => {
        if (md.renderer.rules[rule]) {
            originalRules[rule] = md.renderer.rules[rule];
        }
        md.renderer.rules[rule] = () => '';
    });

    // Text content - return as is
    if (md.renderer.rules.text) {
        originalRules.text = md.renderer.rules.text;
    }
    md.renderer.rules.text = (tokens, idx) => {
        return tokens[idx].content;
    };

    // Code inline - return just the content without backticks
    if (md.renderer.rules.code_inline) {
        originalRules.code_inline = md.renderer.rules.code_inline;
    }
    md.renderer.rules.code_inline = (tokens, idx) => {
        return tokens[idx].content;
    };

    // Images - return alt text or empty string
    if (md.renderer.rules.image) {
        originalRules.image = md.renderer.rules.image;
    }
    md.renderer.rules.image = (tokens, idx) => {
        const alt = tokens[idx].attrGet('alt');
        return alt || '';
    };

    // Line breaks - convert to spaces
    if (md.renderer.rules.hardbreak) {
        originalRules.hardbreak = md.renderer.rules.hardbreak;
    }
    md.renderer.rules.hardbreak = () => ' ';

    if (md.renderer.rules.softbreak) {
        originalRules.softbreak = md.renderer.rules.softbreak;
    }
    md.renderer.rules.softbreak = () => ' ';

    // HTML inline - ignore
    if (md.renderer.rules.html_inline) {
        originalRules.html_inline = md.renderer.rules.html_inline;
    }
    md.renderer.rules.html_inline = () => '';

    // Parse the markdown
    const tokens = md.parse(mdContent, {});

    // Extract only inline content from block elements
    const plainText = extractPlainText(tokens);

    // Restore original rules
    Object.keys(originalRules).forEach((rule) => {
        md.renderer.rules[rule] = originalRules[rule];
    });

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
                text += token.content;
                break;
            case 'code_inline':
                text += token.content;
                break;
            case 'image':
                const alt = token.attrGet('alt');
                if (alt) {
                    text += alt;
                }
                break;
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
                break;
            case 'cradle_link':
                text += renderCradleLink(new Map(), token, true);
                break;
            case 'footnote_ref':
                text += token.content;
                break;
            case 'html_inline':
                // Skip formatting tags
                break;
            default:
                // For any custom tokens like cradle_link, try to get their content
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
