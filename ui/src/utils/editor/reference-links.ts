import {
    pluginReplaceSpansLineBreak,
    revealSelection,
    revealStateChanged,
} from '@/utils/editor/plugin-decoration-utils';
import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, type Text } from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    hoverTooltip,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import type { InlineContext, MarkdownConfig } from '@lezer/markdown';
import type { components } from '@services/openapi/schema';
import {
    FILE_KIND_TONE,
    formatFileSize,
    getFileKind,
    getFileTypeLabel,
} from '@utils/files';

type FileDownload = components['schemas']['FileDownload'];
type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];
type FileDownloadRequest = { fileId: string };

// Labels written by "Insert reference" (`<file id>` or `<file id>-<name>`). A label of
// this shape with no matching file is a reference to a file that is gone.
const FILE_TAG_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-|$)/i;

/** The file a reference key points at; keys match case-insensitively. */
function findReferencedFile(
    mappings: Record<string, FileReferenceWithNote>,
    key: string,
): FileReferenceWithNote | undefined {
    return mappings[key] || mappings[key.toLowerCase()];
}

const CHIP_CLASS =
    'inline-flex max-w-full items-center gap-1.5 h-[1.8em] pr-2 pl-1.5 align-middle border text-[0.9em] font-medium leading-none whitespace-nowrap';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createIcon(paths: string[], className = 'size-3.5 shrink-0'): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', className);
    for (const d of paths) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
    }
    return svg;
}

const WARNING_ICON = ['M12 3 2 20h20z', 'M12 10v4', 'M12 17h.01'];
const COPY_ICON = ['M9 9h11v11H9z', 'M5 15V5h10'];
const DOWNLOAD_ICON = ['M12 4v11', 'm7 10 5 5 5-5', 'M5 20h14'];

function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function openFile(
    file: FileReferenceWithNote,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
) {
    if (!file.id) return;
    resolveMinioLink({ fileId: file.id })
        .then(({ presigned_url }) => {
            window.open(presigned_url, '_blank', 'noopener,noreferrer');
        })
        .catch(() => {
            console.error('Failed to resolve download link for file:', file.id);
        });
}

/**
 * Widget to display the reference link.
 * It renders as a styled span element, hiding the underlying markdown syntax.
 */
class ReferenceLinkWidget extends WidgetType {
    text: string;
    file: FileReferenceWithNote;
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReferenceWithNote,
        resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    ) {
        super();
        this.text = text;
        this.file = file;
        this.resolveMinioLink = resolveMinioLink;
    }

    eq(other: ReferenceLinkWidget) {
        return (
            other.text === this.text &&
            other.file.id === this.file.id &&
            other.file.size === this.file.size &&
            other.file.mime_type === this.file.mime_type
        );
    }

    toDOM(_view: EditorView) {
        const kind = getFileKind(this.file.mime_type, this.file.name);
        const chip = createElement(
            'span',
            `${CHIP_CLASS} cursor-pointer border-foreground/15 bg-foreground/[0.07] text-foreground transition-colors hover:border-primary hover:bg-foreground/10`,
        );
        chip.append(
            createElement(
                'span',
                `px-1 py-[0.2em] font-mono text-[0.7em] font-semibold tracking-wide ${FILE_KIND_TONE[kind]}`,
                getFileTypeLabel(this.file.name),
            ),
            createElement('span', 'truncate', this.text),
        );
        if (this.file.size != null) {
            chip.append(
                createElement(
                    'span',
                    'font-normal text-muted-foreground',
                    formatFileSize(this.file.size),
                ),
            );
        }

        chip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFile(this.file, this.resolveMinioLink);
        });

        return chip;
    }

    // Same as prosemark replace widgets: let CodeMirror handle mousedown so
    // selection updates work; opening the file still happens on click.
    ignoreEvent() {
        return false;
    }
}

/**
 * Widget for a reference whose file no longer exists (or is not visible to the user).
 */
class MissingReferenceWidget extends WidgetType {
    constructor(readonly text: string) {
        super();
    }

    eq(other: MissingReferenceWidget) {
        return other.text === this.text;
    }

    toDOM(_view: EditorView) {
        const chip = createElement(
            'span',
            `${CHIP_CLASS} border-destructive/45 bg-destructive/5 text-destructive`,
        );
        chip.title =
            'File not found. It may have been deleted, or you may not have access to it.';
        chip.append(
            createIcon(WARNING_ICON),
            createElement('s', 'truncate', this.text),
            createElement('span', 'font-normal', 'missing'),
        );
        return chip;
    }

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
    file: FileReferenceWithNote;
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>;

    constructor(
        text: string,
        file: FileReferenceWithNote,
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
 * @param mappings   Label -> FileReferenceWithNote lookup table
 */
function parseExternalReference(
    cx: InlineContext,
    textStart: number,
    pos: number,
    kind: 'ExternalReferenceLink' | 'ExternalReferenceImage',
    mappings: Record<string, FileReferenceWithNote>,
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

    if (
        findReferencedFile(mappings, key) ||
        (!isShortcut && FILE_TAG_PATTERN.test(key))
    ) {
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
    mappings: Record<string, FileReferenceWithNote>,
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
    mappings: Record<string, FileReferenceWithNote>,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
    sourceMode: boolean,
) {
    const plugin = ViewPlugin.fromClass(
        class {
            mappings: Record<string, FileReferenceWithNote>;
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
                    update.selectionSet ||
                    revealStateChanged(update)
                ) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView): DecorationSet {
                const widgets: Range<Decoration>[] = [];
                const state = view.state;
                const doc = state.doc;
                const cursorPos = revealSelection(state).head;

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
    if (sourceMode) return [plugin];
    return [plugin, referenceHoverCard(mappings, resolveMinioLink)];
}

/** The mapping key a reference node points at: its label, or its text when unlabeled. */
function referenceKey(node: SyntaxNode, slice: (from: number, to: number) => string) {
    const textNode = node.getChild('ExternalReferenceText');
    if (!textNode) return null;
    const linkText = slice(textNode.from, textNode.to);
    const labelNode = node.getChild('ExternalReferenceLabel');
    if (labelNode) {
        const label = slice(labelNode.from, labelNode.to);
        if (label.trim() !== '') return { linkText, key: label };
    }
    return { linkText, key: linkText };
}

/**
 * Hover card for file reference chips: type, size, SHA-256, entities and a download
 * button. Hidden while the cursor is inside the reference (its source is showing).
 */
function referenceHoverCard(
    mappings: Record<string, FileReferenceWithNote>,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
) {
    return hoverTooltip(
        (view, pos, side) => {
            let node: SyntaxNode | null = syntaxTree(view.state).resolveInner(
                pos,
                side,
            );
            while (node && node.name !== 'ExternalReferenceLink') node = node.parent;
            if (!node) return null;

            const cursorPos = revealSelection(view.state).head;
            if (cursorPos >= node.from && cursorPos <= node.to) return null;

            const ref = referenceKey(node, (from, to) => view.state.sliceDoc(from, to));
            const file = ref && findReferencedFile(mappings, ref.key);
            if (!file) return null;

            return {
                pos: node.from,
                end: node.to,
                above: true,
                create: () => ({ dom: buildFileCard(file, resolveMinioLink) }),
            };
        },
        { hideOnChange: true },
    );
}

function buildFileCard(
    file: FileReferenceWithNote,
    resolveMinioLink: (file: FileDownloadRequest) => Promise<FileDownload>,
): HTMLElement {
    const kind = getFileKind(file.mime_type, file.name);
    const card = createElement('div', 'cm-file-card w-80 text-sm');

    const header = createElement('div', 'flex gap-3 p-3');
    header.append(
        createElement(
            'div',
            `flex size-10 shrink-0 items-center justify-center font-mono text-[10px] font-semibold ${FILE_KIND_TONE[kind]}`,
            getFileTypeLabel(file.name),
        ),
    );
    const title = createElement('div', 'min-w-0 flex-1');
    title.append(
        createElement('div', 'truncate font-semibold', file.name ?? 'file'),
        createElement(
            'div',
            'truncate font-mono text-xs text-muted-foreground',
            [
                file.mime_type ?? 'type pending',
                file.size != null ? formatFileSize(file.size) : null,
            ]
                .filter(Boolean)
                .join(' · '),
        ),
    );
    header.append(title);

    const details = createElement(
        'div',
        'flex flex-col gap-1.5 border-t border-border px-3 py-2 text-xs',
    );
    const hashRow = createElement('div', 'flex h-6 items-center gap-2');
    hashRow.append(
        createElement('span', 'w-14 shrink-0 text-muted-foreground', 'SHA-256'),
        createElement(
            'span',
            `min-w-0 flex-1 truncate font-mono${file.sha256 ? '' : ' text-muted-foreground'}`,
            file.sha256 ?? 'computing…',
        ),
    );
    if (file.sha256) {
        const sha256 = file.sha256;
        const copy = createElement(
            'button',
            'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground',
        );
        copy.type = 'button';
        copy.title = 'Copy SHA-256';
        copy.setAttribute('aria-label', 'Copy SHA-256');
        copy.append(createIcon(COPY_ICON));
        copy.addEventListener('click', () => {
            void navigator.clipboard.writeText(sha256).then(() => {
                copy.title = 'Copied';
                copy.classList.add('text-primary');
            });
        });
        hashRow.append(copy);
    }
    details.append(hashRow);

    const entities = file.entities ?? [];
    if (entities.length > 0) {
        const entityRow = createElement('div', 'flex items-start gap-2');
        const list = createElement('div', 'flex min-w-0 flex-1 flex-wrap gap-1');
        for (const entity of entities.slice(0, 3)) {
            const badge = createElement(
                'span',
                'inline-flex max-w-full items-center gap-1 bg-muted px-1.5 py-px',
            );
            if (entity.color) {
                const swatch = createElement('span', 'size-2 shrink-0');
                swatch.style.backgroundColor = entity.color;
                badge.append(swatch);
            }
            badge.append(createElement('span', 'truncate', entity.name));
            list.append(badge);
        }
        if (entities.length > 3) {
            list.append(
                createElement(
                    'span',
                    'text-muted-foreground',
                    `+${entities.length - 3}`,
                ),
            );
        }
        entityRow.append(
            createElement(
                'span',
                'w-14 shrink-0 py-px text-muted-foreground',
                'Entities',
            ),
            list,
        );
        details.append(entityRow);
    }

    const download = createElement(
        'button',
        'flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 border-t border-border font-medium hover:bg-muted',
    );
    download.type = 'button';
    download.append(createIcon(DOWNLOAD_ICON, 'size-4 shrink-0'), 'Download');
    download.addEventListener('click', () => openFile(file, resolveMinioLink));

    card.append(header, details, download);
    return card;
}

function createReferenceDecoration(
    doc: Text,
    node: { from: number; to: number; node: SyntaxNode },
    text: string,
    cursorPos: number,
    mappings: Record<string, FileReferenceWithNote>,
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

    const ref = referenceKey(node.node, (start, end) => text.slice(start, end));
    if (!ref) return null;
    const { linkText, key } = ref;

    const reference = findReferencedFile(mappings, key);

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
    if (FILE_TAG_PATTERN.test(key)) {
        return Decoration.replace({
            widget: new MissingReferenceWidget(linkText),
            inclusive: false,
            block: false,
        }).range(from, to);
    }
    return null;
}
