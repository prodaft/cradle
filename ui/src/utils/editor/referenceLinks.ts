import { FileTransferDownloadRetrieveRequest } from '@/services/cradle/apis/FileTransferApi';
import { FileDownload, FileReferenceWithNote } from '@/services/cradle/models';
import { syntaxTree } from '@codemirror/language';
import { EditorState, Range } from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import { MarkdownConfig } from '@lezer/markdown';
import type { NavigateOptions } from '@tanstack/react-router';

// Type alias for compatibility - export it
export type FileReference = FileReferenceWithNote;

/**
 * Widget to display the reference link.
 * It renders as a standard anchor tag, hiding the underlying markdown syntax.
 */
export class ReferenceLinkWidget extends WidgetType {
    text: string;
    file: FileReference;
    navigate: (url: string, options?: NavigateOptions) => void;
    resolveMinioLink: (
        file: FileTransferDownloadRetrieveRequest,
    ) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReference,
        navigate: (url: string, options?: NavigateOptions) => void,
        resolveMinioLink: (
            file: FileTransferDownloadRetrieveRequest,
        ) => Promise<FileDownload>,
    ) {
        super();
        this.text = text;
        this.file = file;
        this.navigate = navigate;
        this.resolveMinioLink = resolveMinioLink;
    }

    eq(other: ReferenceLinkWidget) {
        return other.text === this.text && other.file.id === this.file.id;
    }

    toDOM(view: EditorView) {
        const span = document.createElement('span');
        const a = document.createElement('a');
        a.innerText = this.text;
        a.href = `/#download`;
        span.appendChild(a);

        // Styling to make it look like a regular link within the editor
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        span.style.color = 'var(--cradle-link-color, var(--primary))';

        span.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.resolveMinioLink({
                fileId: this.file.id!,
            }).then((fdownload) => {
                const { presignedUrl } = fdownload;
                window.open(presignedUrl, '_blank', 'noopener,noreferrer');
            });
        });

        return span;
    }

    ignoreEvent(e: Event) {
        // Ignore mousedown events so CodeMirror doesn't interfere with the link click
        return e.type === 'mousedown';
    }
}

/**
 * Widget to display the reference image.
 * It renders as a standard img tag, hiding the underlying markdown syntax.
 * Uses a static cache to preserve image URLs across widget recreations (e.g., when scrolling).
 */
export class ReferenceImageWidget extends WidgetType {
    // Static cache to store resolved presigned URLs by file ID
    // This prevents images from unloading when scrolling out of view and back
    private static urlCache = new Map<string, string>();

    text: string;
    file: FileReference;
    resolveMinioLink: (
        file: FileTransferDownloadRetrieveRequest,
    ) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReference,
        resolveMinioLink: (
            file: FileTransferDownloadRetrieveRequest,
        ) => Promise<FileDownload>,
    ) {
        super();
        this.text = text;
        this.file = file;
        this.resolveMinioLink = resolveMinioLink;
    }

    eq(other: ReferenceImageWidget) {
        return other.text === this.text && other.file.id === this.file.id;
    }

    toDOM(view: EditorView) {
        const img = document.createElement('img');
        img.alt = this.text;
        img.style.maxWidth = '40%';
        img.style.cursor = 'default';

        const fileId = this.file.id!;
        const cachedUrl = ReferenceImageWidget.urlCache.get(fileId);

        if (cachedUrl) {
            // Use cached URL immediately to prevent image flicker
            img.src = cachedUrl;
        } else {
            // Fetch and cache the URL
            this.resolveMinioLink({
                fileId: fileId,
            }).then((fdownload) => {
                const { presignedUrl } = fdownload;
                ReferenceImageWidget.urlCache.set(fileId, presignedUrl);
                img.src = presignedUrl;
            });
        }

        return img;
    }

    ignoreEvent(e: Event) {
        return false;
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
                    if (next != 91) return -1; // '['

                    // --- Parse Text Part: [ ... ] ---
                    const textStart = pos + 1;
                    let p = textStart;
                    let balance = 1;
                    let opening = 1;

                    // Scan for matching closing bracket, respecting escapes
                    while (p < cx.end && balance > 0) {
                        const code = cx.char(p);
                        if (code == 92) {
                            // '\' escape
                            p += 2;
                            continue;
                        }
                        if (code == 91) {
                            // '['
                            opening++;
                            balance++;
                        } else if (code == 93) {
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
                    let isCollapsed = false;
                    let isShortcut = false;

                    let lookahead = p;
                    let hasSpace = false;
                    if (lookahead < cx.end && cx.char(lookahead) === 32) {
                        lookahead++;
                        hasSpace = true;
                    }
                    if (lookahead < cx.end && cx.char(lookahead) === 40) {
                        return -1;
                    }

                    if (lookahead < cx.end && cx.char(lookahead) === 91) {
                        // Found second '['
                        const secondBracketStart = lookahead + 1;
                        let q = secondBracketStart;

                        // Scan for closing ']' for the label
                        // Labels usually cannot contain brackets
                        while (q < cx.end) {
                            const code = cx.char(q);
                            if (code == 92) {
                                // Escape
                                q += 2;
                                continue;
                            }
                            if (code == 93) {
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

                    let key = '';
                    if (!isShortcut) {
                        if (labelContent.trim() === '') {
                            key = textContent;
                            isCollapsed = true;
                        } else {
                            key = labelContent;
                        }
                    } else {
                        key = textContent;
                    }

                    if (mappings[key] || mappings[key.toLowerCase()]) {
                        const endPos = p;
                        return cx.addElement(
                            cx.elt('ExternalReferenceLink', pos, endPos, [
                                cx.elt('ExternalReferenceText', textStart, textEnd),
                                ...(labelStart !== -1
                                    ? [
                                          cx.elt(
                                              'ExternalReferenceLabel',
                                              labelStart,
                                              labelEnd,
                                          ),
                                      ]
                                    : []),
                            ]),
                        );
                    }

                    return -1; // No match, fallback to standard parsing
                },
            },
            {
                name: 'ExternalReferenceImage',
                before: 'Image',
                parse(cx, next, pos) {
                    if (next != 33) return -1; // '!'
                    if (cx.char(pos + 1) != 91) return -1; // '['

                    // --- Parse Text Part: ![ ... ] ---
                    const textStart = pos + 2;
                    let p = textStart;
                    let balance = 1;
                    let opening = 1;

                    // Scan for matching closing bracket, respecting escapes
                    while (p < cx.end && balance > 0) {
                        const code = cx.char(p);
                        if (code == 92) {
                            // '\' escape
                            p += 2;
                            continue;
                        }
                        if (code == 91) {
                            // '['
                            opening++;
                            balance++;
                        } else if (code == 93) {
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
                    let isCollapsed = false;
                    let isShortcut = false;

                    let lookahead = p;
                    let hasSpace = false;
                    if (lookahead < cx.end && cx.char(lookahead) === 32) {
                        lookahead++;
                        hasSpace = true;
                    }
                    if (lookahead < cx.end && cx.char(lookahead) === 40) {
                        return -1;
                    }

                    if (lookahead < cx.end && cx.char(lookahead) === 91) {
                        // Found second '['
                        const secondBracketStart = lookahead + 1;
                        let q = secondBracketStart;

                        // Scan for closing ']' for the label
                        // Labels usually cannot contain brackets
                        while (q < cx.end) {
                            const code = cx.char(q);
                            if (code == 92) {
                                // Escape
                                q += 2;
                                continue;
                            }
                            if (code == 93) {
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

                    let key = '';
                    if (!isShortcut) {
                        if (labelContent.trim() === '') {
                            key = textContent;
                            isCollapsed = true;
                        } else {
                            key = labelContent;
                        }
                    } else {
                        key = textContent;
                    }

                    if (mappings[key] || mappings[key.toLowerCase()]) {
                        const endPos = p;
                        return cx.addElement(
                            cx.elt('ExternalReferenceImage', pos, endPos, [
                                cx.elt('ExternalReferenceText', textStart, textEnd),
                                ...(labelStart !== -1
                                    ? [
                                          cx.elt(
                                              'ExternalReferenceLabel',
                                              labelStart,
                                              labelEnd,
                                          ),
                                      ]
                                    : []),
                            ]),
                        );
                    }

                    return -1; // No match, fallback to standard parsing
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
    navigate: (url: string, options?: NavigateOptions) => void,
    resolveMinioLink: (
        file: FileTransferDownloadRetrieveRequest,
    ) => Promise<FileDownload>,
    sourceMode: boolean,
) {
    return ViewPlugin.fromClass(
        class {
            mappings: Record<string, FileReference>;
            navigate: (url: string, options?: NavigateOptions) => void;
            resolveMinioLink: (
                file: FileTransferDownloadRetrieveRequest,
            ) => Promise<FileDownload>;
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.mappings = mappings;
                this.navigate = navigate;
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
                                node,
                                doc.toString(),
                                cursorPos,
                                this.mappings,
                                this.navigate,
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
    node: { from: number; to: number; node: SyntaxNode },
    text: string,
    cursorPos: number,
    mappings: Record<string, FileReference>,
    navigate: (url: string, options?: NavigateOptions) => void,
    resolveMinioLink: (
        file: FileTransferDownloadRetrieveRequest,
    ) => Promise<FileDownload>,
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

    if (cursorPos >= from && cursorPos <= to) {
        return null;
    }

    const textNode = node.node.getChild('ExternalReferenceText');
    if (!textNode) return null;

    const linkText = text.slice(textNode.from, textNode.to);

    let key = linkText;
    const labelNode = node.node.getChild('ExternalReferenceLabel');
    console.log(labelNode);
    if (labelNode) {
        const label = text.slice(labelNode.from, labelNode.to);
        if (label.trim() !== '') {
            key = label;
        }
    }
    console.log(key);

    const reference = mappings[key] || mappings[key.toLowerCase()];

    if (reference) {
        let widget: WidgetType;
        if (node.node.name === 'ExternalReferenceImage') {
            console.log(reference);
            widget = new ReferenceImageWidget(linkText, reference, resolveMinioLink);
        } else {
            widget = new ReferenceLinkWidget(
                linkText,
                reference,
                navigate,
                resolveMinioLink,
            );
        }

        return Decoration.replace({
            widget,
            inclusive: false,
            block: false,
        }).range(from, to);
    }
    return null;
}
