import { FileDownload, FileReferenceWithNote } from '@services/cradle';
import { FileTransferApi } from '@services/cradle/apis';
import matter from 'gray-matter';
import jsYaml from 'js-yaml';
import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it/index.js';
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
    const colorClass = entryColors.get(type) || 'var(--foreground)';

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

/**
 * Render a footnote reference as HTML
 * Formats markdown footnote syntax [text][ref] into a link
 */
export function renderFootnoteRef(token: Token): string {
    const content = token.content || '';
    const footnoteRef = (token as any).footnote_ref || '';

    // If there's a reference, create an anchor link to the footnote
    if (footnoteRef) {
        return `<a href="#fn-${footnoteRef}" class="footnote-ref" id="fnref-${footnoteRef}">${content}</a>`;
    }

    // Otherwise, just return the content
    return content;
}

let DownloadLinkPromiseCache: Record<string, Promise<FileDownload>> = {};
let MinioCache: Record<string, FileDownload> = {};

export function fetchMinioDownloadLink(
    fileTransferApi: FileTransferApi,
    fileId: string,
): Promise<FileDownload> {
    if (!DownloadLinkPromiseCache[fileId]) {
        DownloadLinkPromiseCache[fileId] = fileTransferApi
            .fileTransferDownloadRetrieve({ fileId })
            .then(({ presignedUrl, expiresIn }) => {
                return {
                    presignedUrl,
                    expiresIn: Date.now() + expiresIn,
                };
            });
    }
    return DownloadLinkPromiseCache[fileId];
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
        if (!href.includes('/file-transfer/download/')) return;

        let url: URL;
        try {
            url = new URL(href, window.location.origin);
        } catch {
            return;
        }

        const params = new URLSearchParams(url.search);
        const fileId = params.get('fileId');
        if (!fileId) return;

        let cached = MinioCache[fileId];
        let presigned: string | undefined = cached?.presignedUrl;
        let expiry: number | undefined = cached?.expiresIn;
        if (!presigned || Date.now() > (expiry || 0)) {
            const result = await fetchMinioDownloadLink(fileTransferApi, fileId);
            presigned = result.presignedUrl;
            expiry = result.expiresIn;
            MinioCache[fileId] = result;
        }
        token.attrs![hrefIndex][1] = presigned;
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
    fileData: FileReferenceWithNote[] | undefined,
    entryColors: Map<string, string>,
    fileTransferApi: FileTransferApi,
    baseURL: string,
): Promise<{ html: string; metadata: Record<string, any> }> {
    DownloadLinkPromiseCache = {};
    md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);
    md.renderer.rules.cradle_link = (tokens: Token[], idx: number) =>
        renderCradleLink(entryColors, tokens[idx]);

    // Override image renderer to add max-width constraint (matching RichEditor behavior)
    const originalImageRule = md.renderer.rules.image;
    md.renderer.rules.image = (
        tokens: Token[],
        idx: number,
        options: any,
        env: any,
        self: any,
    ) => {
        const token = tokens[idx];
        const src = token.attrGet('src') || '';
        const alt = token.attrGet('alt') || '';
        const title = token.attrGet('title') || '';

        // Escape HTML attributes for text content (alt, title)
        // src is typically a URL and should already be properly encoded
        const escapeAttr = (str: string) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        // Build attributes string
        let attrs = `src="${src}" alt="${escapeAttr(alt)}"`;
        if (title) {
            attrs += ` title="${escapeAttr(title)}"`;
        }

        // Add max-width styling to match RichEditor (40% max-width)
        attrs += ' style="max-width: 40%; cursor: default;"';

        return `<img ${attrs}>`;
    };

    // Override paragraph_close to preserve empty lines
    const originalParagraphClose = md.renderer.rules.paragraph_close;
    md.renderer.rules.paragraph_close = (
        tokens: Token[],
        idx: number,
        options: any,
        env: any,
        self: any,
    ) => {
        // Find the corresponding paragraph_open token
        let openIdx = idx;
        while (openIdx >= 0 && tokens[openIdx].type !== 'paragraph_open') {
            openIdx--;
        }

        if (openIdx >= 0) {
            // Check if paragraph has any real content between open and close
            let hasContent = false;
            for (let i = openIdx + 1; i < idx; i++) {
                const token = tokens[i];
                if (
                    token.type === 'inline' &&
                    token.children &&
                    token.children.length > 0
                ) {
                    // Check if inline content has any non-whitespace (excluding zero-width space)
                    for (const child of token.children) {
                        if (child.type === 'text') {
                            // Remove zero-width spaces and whitespace, then check if anything remains
                            const trimmed = child.content.replace(/\u200B/g, '').trim();
                            if (trimmed) {
                                hasContent = true;
                                break;
                            }
                        } else if (
                            child.type !== 'text' &&
                            child.type !== 'softbreak' &&
                            child.type !== 'hardbreak'
                        ) {
                            hasContent = true;
                            break;
                        }
                    }
                    if (hasContent) break;
                } else if (token.type !== 'softbreak' && token.type !== 'hardbreak') {
                    hasContent = true;
                    break;
                }
            }

            // If paragraph is empty (or only contains zero-width space), add a <br> to preserve the empty line
            if (!hasContent) {
                return '<br></p>';
            }
        }

        // Use original renderer if it exists, otherwise default
        if (originalParagraphClose) {
            return originalParagraphClose(tokens, idx, options, env, self);
        }
        return '</p>';
    };

    let metadata = {};
    try {
        let note = matter(mdContent, {
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
        if (note.content || mdContent.trim().endsWith('---'))
            // If the content ends with '---' or note is not empty, there exists frontmatter
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
    const tokens = md.parse(content, {});
    await processTokens(tokens, fileTransferApi, baseURL);
    let html = md.renderer.render(tokens, md.options, metadata);

    // Post-process HTML to convert zero-width space paragraphs to <br> tags
    // This handles paragraphs that only contain zero-width spaces (our empty line markers)
    html = html.replace(/<p>\u200B<\/p>/g, '<p><br></p>');
    // Also handle cases where zero-width space might be in a paragraph with other whitespace
    html = html.replace(/<p>\s*\u200B\s*<\/p>/g, '<p><br></p>');

    return { html, metadata };
}

export function parseWithExtensionsInline(md: MarkdownIt, mdContent: string): string {
    DownloadLinkPromiseCache = {};

    // Add the cradle link rule
    md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);

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
            case 'reference_link':
                text += token.content;
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
