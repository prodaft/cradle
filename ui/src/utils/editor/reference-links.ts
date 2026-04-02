import { pluginReplaceSpansLineBreak } from '@/utils/editor/plugin-decoration-utils';
import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, type Text } from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import type { InlineContext, MarkdownConfig } from '@lezer/markdown';
import type { components } from '@services/openapi/schema';

type FileDownload = components['schemas']['FileDownload'];
type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];
type FileDownloadRequest = { fileId: string };

// Type alias for compatibility - export it
type FileReference = FileReferenceWithNote;

/**
 * Widget to display the reference link.
 * It renders as a styled span element, hiding the underlying markdown syntax.
 */
class ReferenceLinkWidget extends WidgetType {
    text: string;
    file: FileReference;
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReference,
        resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    ) {
        super();
        this.text = text;
        this.file = file;
        this.resolveMinioLink = resolveMinioLink;
    }

    eq(other: ReferenceLinkWidget) {
        return other.text === this.text && other.file.id === this.file.id;
    }

    toDOM(_view: EditorView) {
        const span = document.createElement('span');
        span.innerText = this.text;

        // Styling to make it look like a regular link within the editor
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        span.style.color = 'var(--cradle-link-color, var(--primary))';

        span.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.file.id) return;
            this.resolveMinioLink({
                fileId: this.file.id,
            })
                .then((fdownload) => {
                    const { presigned_url } = fdownload;
                    window.open(presigned_url, '_blank', 'noopener,noreferrer');
                })
                .catch(() => {
                    console.error(
                        'Failed to resolve download link for file:',
                        this.file.id,
                    );
                });
        });

        return span;
    }

    // Same as prosemark replace widgets: let CodeMirror handle mousedown so
    // selection updates work; opening the file still happens on click.
    ignoreEvent() {
        return false;
    }
}

/**
 * Widget to display the reference image.
 * It renders as a standard img tag, hiding the underlying markdown syntax.
 * Uses a static cache to preserve image URLs across widget recreations (e.g., when scrolling).
 */
class ReferenceImageWidget extends WidgetType {
    // Static cache to store resolved presigned URLs by file ID
    // This prevents images from unloading when scrolling out of view and back
    private static urlCache = new Map<string, string>();

    text: string;
    file: FileReference;
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReference,
        resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    ) {
        super();
        this.text = text;
        this.file = file;
        this.resolveMinioLink = resolveMinioLink;
    }

    eq(other: ReferenceImageWidget) {
        return other.text === this.text && other.file.id === this.file.id;
    }

    toDOM(_view: EditorView) {
        const img = document.createElement('img');
        img.alt = this.text;
        img.style.maxWidth = '40%';
        img.style.cursor = 'default';

        const fileId = this.file.id;
        if (!fileId) return img;

        const cachedUrl = ReferenceImageWidget.urlCache.get(fileId);

        if (cachedUrl) {
            // Use cached URL immediately to prevent image flicker
            img.src = cachedUrl;
        } else {
            // Fetch and cache the URL
            this.resolveMinioLink({
                fileId: fileId,
            })
                .then((fdownload) => {
                    const { presigned_url } = fdownload;
                    ReferenceImageWidget.urlCache.set(fileId, presigned_url);
                    img.src = presigned_url;
                })
                .catch(() => {
                    img.alt = `Failed to load: ${this.text}`;
                    console.error('Failed to resolve image URL for file:', fileId);
                });
        }

        return img;
    }

    /**
     * Clear the URL cache. Useful when files are updated or when
     * presigned URLs need to be refreshed.
     */
    static clearCache() {
        ReferenceImageWidget.urlCache.clear();
    }

    /**
     * Remove a specific file from the cache.
     */
    static invalidateFile(fileId: string) {
        ReferenceImageWidget.urlCache.delete(fileId);
    }
}

/**
 * Shared parse logic for ExternalReferenceLink and ExternalReferenceImage.
 *
 * @param cx       Lezer inline parse context
 * @param textStart  Position of the first character inside the opening `[`
 * @param pos        Position of the very first character of the construct (`[` or `!`)
 * @param kind       `'ExternalReferenceLink'` or `'ExternalReferenceImage'`
 * @param mappings   Label → FileReference lookup table
 */
function parseExternalReference(
    cx: InlineContext,
    textStart: number,
    pos: number,
    kind: 'ExternalReferenceLink' | 'ExternalReferenceImage',
    mappings: Record<string, FileReference>,
): number {
    let p = textStart;
    let balance = 1;
    let opening = 1;

    // Scan for matching closing bracket, respecting escapes
    while (p < cx.end && balance > 0) {
        const code = cx.char(p);
        if (code === 92) {
            // '\' escape
            p += 2;
            continue;
        }
        if (code === 91) {
            // '['
            opening++;
            balance++;
        } else if (code === 93) {
            // ']'
            balance--;
        }
        p++;
    }

    // If 2 opening brackets, it's a cradle link
    if (opening === 2) {
        return -1;
    }

    // If unbalanced or EOF
    if (balance !== 0) return -1;

    const textEnd = p - 1;
    const textContent = cx.slice(textStart, textEnd).toString();

    let labelStart = -1;
    let labelEnd = -1;
    let labelContent = '';
    let isShortcut = false;

    let lookahead = p;
    if (lookahead < cx.end && cx.char(lookahead) === 32) {
        lookahead++;
    }
    if (lookahead < cx.end && cx.char(lookahead) === 40) {
        return -1;
    }

    if (lookahead < cx.end && cx.char(lookahead) === 91) {
        // Found second '['
        const secondBracketStart = lookahead + 1;
        let q = secondBracketStart;

        // Scan for closing ']' for the label
        while (q < cx.end) {
            const code = cx.char(q);
            if (code === 92) {
                // Escape
                q += 2;
                continue;
            }
            if (code === 93) {
                // ']'
                break;
            }
            q++;
        }

        if (q < cx.end && cx.char(q) === 93) {
            labelStart = secondBracketStart;
            labelEnd = q;
            labelContent = cx.slice(labelStart, labelEnd).toString();
            p = q + 1;
        } else {
            isShortcut = true;
        }
    } else {
        isShortcut = true;
    }

    const key = !isShortcut
        ? labelContent.trim() === ''
            ? textContent
            : labelContent
        : textContent;

    if (mappings[key] || mappings[key.toLowerCase()]) {
        const endPos = p;
        return cx.addElement(
            cx.elt(kind, pos, endPos, [
                cx.elt('ExternalReferenceText', textStart, textEnd),
                ...(labelStart !== -1
                    ? [cx.elt('ExternalReferenceLabel', labelStart, labelEnd)]
                    : []),
            ]),
        );
    }

    return -1; // No match, fallback to standard parsing
}

/**
 * Lezer Markdown extension to parse custom reference links.
 * It looks for patterns like [text][label] where 'label' exists in the provided mappings.
 *
 * Prioritizes:
 * 1. [text][label] -> uses 'label' key
 * 2. [text][]      -> uses 'text' key (collapsed reference)
 * 3. [text]        -> uses 'text' key (shortcut reference) - IF text matches a mapping
 */
export function referenceLinkSyntax(
    mappings: Record<string, FileReference>,
): MarkdownConfig {
    return {
        defineNodes: [
            { name: 'ExternalReferenceLink' },
            { name: 'ExternalReferenceImage' },
            { name: 'ExternalReferenceText' },
            { name: 'ExternalReferenceLabel' },
        ],
        parseInline: [
            {
                name: 'ExternalReferenceLink',
                before: 'Link',
                parse(cx, next, pos) {
                    if (next !== 91) return -1; // '['
                    return parseExternalReference(
                        cx,
                        pos + 1,
                        pos,
                        'ExternalReferenceLink',
                        mappings,
                    );
                },
            },
            {
                name: 'ExternalReferenceImage',
                before: 'Image',
                parse(cx, next, pos) {
                    if (next !== 33) return -1; // '!'
                    if (cx.char(pos + 1) !== 91) return -1; // '['
                    return parseExternalReference(
                        cx,
                        pos + 2,
                        pos,
                        'ExternalReferenceImage',
                        mappings,
                    );
                },
            },
        ],
    };
}

/**
 * CodeMirror ViewPlugin to render the ExternalReferenceLink nodes.
 */
export function referenceLinksPlugin(
    mappings: Record<string, FileReference>,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    sourceMode: boolean,
) {
    return ViewPlugin.fromClass(
        class {
            mappings: Record<string, FileReference>;
            resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>;
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.mappings = mappings;
                this.resolveMinioLink = resolveMinioLink;
                this.decorations = this.buildDecorations(view);
            }

            update(update: {
                docChanged: boolean;
                viewportChanged: boolean;
                selectionSet: boolean;
                view: EditorView;
                startState: EditorState;
                state: EditorState;
            }) {
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet
                ) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView): DecorationSet {
                const widgets: Range<Decoration>[] = [];
                const state = view.state;
                const doc = state.doc;
                const selection = state.selection.main;
                const cursorPos = selection.head;

                syntaxTree(state).iterate({
                    enter: (node) => {
                        if (
                            node.type.name === 'ExternalReferenceLink' ||
                            node.type.name === 'ExternalReferenceImage'
                        ) {
                            const decoration = createReferenceDecoration(
                                doc,
                                node,
                                doc.toString(),
                                cursorPos,
                                this.mappings,
                                this.resolveMinioLink,
                                sourceMode,
                            );
                            if (decoration) {
                                widgets.push(decoration);
                            }
                        }
                    },
                });

                return Decoration.set(widgets, true);
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
}

function createReferenceDecoration(
    doc: Text,
    node: { from: number; to: number; node: SyntaxNode },
    text: string,
    cursorPos: number,
    mappings: Record<string, FileReference>,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    sourceMode: boolean,
): Range<Decoration> | null {
    if (sourceMode) {
        return null;
    }
    const from = node.from;
    const to = node.to;

    if (to > text.length) {
        return null;
    }

    if (pluginReplaceSpansLineBreak(doc, from, to)) {
        return null;
    }

    if (cursorPos >= from && cursorPos <= to) {
        return null;
    }

    const textNode = node.node.getChild('ExternalReferenceText');
    if (!textNode) return null;

    const linkText = text.slice(textNode.from, textNode.to);

    let key = linkText;
    const labelNode = node.node.getChild('ExternalReferenceLabel');
    if (labelNode) {
        const label = text.slice(labelNode.from, labelNode.to);
        if (label.trim() !== '') {
            key = label;
        }
    }

    const reference = mappings[key] || mappings[key.toLowerCase()];

    if (reference) {
        let widget: WidgetType;
        if (node.node.name === 'ExternalReferenceImage') {
            widget = new ReferenceImageWidget(linkText, reference, resolveMinioLink);
        } else {
            widget = new ReferenceLinkWidget(linkText, reference, resolveMinioLink);
        }

        return Decoration.replace({
            widget,
            inclusive: false,
            block: false,
        }).range(from, to);
    }
    return null;
}
