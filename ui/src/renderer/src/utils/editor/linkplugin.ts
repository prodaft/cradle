import { NavigateOptions } from '@/hooks/navigation/useCradleNavigate';
import { syntaxTree } from '@codemirror/language';
import { Diagnostic, forEachDiagnostic } from '@codemirror/lint';
import { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';

/**
 * Widget to render Cradle links as clickable elements in the editor
 */
export class CradleLinkWidget extends WidgetType {
    type: string;
    name: string;
    alias: string;
    color: string;
    navigate: (url: string, options?: NavigateOptions) => void;
    fullText: string;
    timestamp: string;
    hasPrefix: boolean;

    constructor(
        type: string,
        name: string,
        alias: string,
        color: string,
        navigate: (url: string, options?: NavigateOptions) => void,
        fullText: string,
        timestamp: string,
        hasPrefix: boolean,
    ) {
        super();
        this.type = type;
        this.name = name;
        this.alias = alias;
        this.color = color;
        this.navigate = navigate;
        this.fullText = fullText;
        this.timestamp = timestamp;
        this.hasPrefix = hasPrefix;
    }

    eq(other: CradleLinkWidget): boolean {
        return (
            other.type === this.type &&
            other.name === this.name &&
            other.alias === this.alias &&
            other.color === this.color &&
            other.timestamp === this.timestamp &&
            other.hasPrefix === this.hasPrefix
        );
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.style.display = 'inline';
        container.className = 'cradle-link-widget-container';

        const linkSpan = this.createLinkElement();
        container.appendChild(linkSpan);

        if (this.timestamp) {
            const timestampSpan = this.createTimestampElement();
            container.appendChild(timestampSpan);
        }

        return container;
    }

    createLinkElement(): HTMLSpanElement {
        const linkSpan = document.createElement('span');
        const displayName = this.alias || this.name;
        const url = `/dashboards/${encodeURIComponent(this.type)}/${encodeURIComponent(this.name)}/`;
        const a = document.createElement('a');
        const path = document.location.pathname;
        a.href = `${path}#${url}`;

        a.textContent = displayName;
        linkSpan.style.color = this.color || '#FF8C00';
        linkSpan.style.cursor = 'pointer';
        linkSpan.style.textDecoration = 'underline';
        linkSpan.style.display = 'inline';
        linkSpan.setAttribute('data-link-url', url);
        linkSpan.setAttribute('data-link-full-text', this.fullText);
        linkSpan.className = 'cradle-link-widget';
        linkSpan.appendChild(a);

        linkSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigate(url, { event: e as unknown as React.MouseEvent });
        });

        linkSpan.addEventListener('mouseenter', () => {
            linkSpan.style.opacity = '0.8';
        });

        linkSpan.addEventListener('mouseleave', () => {
            linkSpan.style.opacity = '1';
        });

        return linkSpan;
    }

    createTimestampElement(): HTMLSpanElement {
        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = this.timestamp;
        timestampSpan.style.color = this.color || '#FF8C00';
        timestampSpan.style.fontSize = '0.85em';
        timestampSpan.style.fontStyle = 'italic';
        timestampSpan.style.opacity = '0.7';
        timestampSpan.style.marginLeft = '4px';
        timestampSpan.style.textDecoration = 'underline';
        timestampSpan.style.display = 'inline';
        timestampSpan.className = 'cradle-link-timestamp';
        return timestampSpan;
    }

    ignoreEvent(e: Event): boolean {
        return e.type === 'mousedown';
    }
}

/**
 * Creates a ViewPlugin to render CradleLink nodes as widgets
 */
export function cradleLinksPlugin(
    entryColors: Map<string, string>,
    navigate: (url: string, options?: NavigateOptions) => void,
    sourceMode: boolean,
) {
    return ViewPlugin.fromClass(
        class {
            entryColors: Map<string, string>;
            navigate: (url: string) => void;
            sourceMode: boolean;
            decorations: ReturnType<typeof Decoration.set>;

            constructor(view: EditorView) {
                this.entryColors = entryColors;
                this.navigate = navigate;
                this.sourceMode = sourceMode;
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
                const oldDiagnosticCount = countDiagnostics(update.startState);
                const newDiagnosticCount = countDiagnostics(update.state);
                const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet ||
                    diagnosticsChanged
                ) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                if (this.sourceMode) {
                    return Decoration.set([], true);
                }

                const widgets: Range<Decoration>[] = [];
                const doc = view.state.doc;
                const text = doc.toString();
                const selection = view.state.selection.main;
                const cursorPos = selection.head;
                const tree = syntaxTree(view.state);
                const diagnostics = collectDiagnostics(view.state);

                tree.iterate({
                    enter: (node) => {
                        if (node.type.name === 'CradleLink') {
                            const linkInfo = parseCradleLink(
                                node,
                                text,
                                cursorPos,
                                diagnostics,
                                this.entryColors,
                                this.navigate,
                            );
                            if (linkInfo) {
                                widgets.push(linkInfo);
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

/**
 * Creates a ViewPlugin to style CradleLink text when uncollapsed
 */
export function cradleLinkColorPlugin(
    entryColors: Map<string, string>,
    sourceMode: boolean,
) {
    return ViewPlugin.fromClass(
        class {
            entryColors: Map<string, string>;
            sourceMode: boolean;
            decorations: ReturnType<typeof Decoration.set>;

            constructor(view: EditorView) {
                this.entryColors = entryColors;
                this.sourceMode = sourceMode;
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
                const oldDiagnosticCount = countDiagnostics(update.startState);
                const newDiagnosticCount = countDiagnostics(update.state);
                const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.selectionSet ||
                    diagnosticsChanged
                ) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                const marks: Range<Decoration>[] = [];
                const doc = view.state.doc;
                const text = doc.toString();
                const selection = view.state.selection.main;
                const cursorPos = selection.head;
                const tree = syntaxTree(view.state);
                const diagnostics = collectDiagnostics(view.state);

                tree.iterate({
                    enter: (node) => {
                        if (node.type.name === 'CradleLink') {
                            const colorMarks = createColorMarks(
                                node,
                                text,
                                cursorPos,
                                diagnostics,
                                this.entryColors,
                                this.sourceMode,
                            );
                            marks.push(...colorMarks);
                        }
                    },
                });

                return Decoration.set(marks, true);
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
}

function countDiagnostics(state: EditorState): number {
    let count = 0;
    forEachDiagnostic(state, () => {
        count++;
    });
    return count;
}

function collectDiagnostics(state: EditorState): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    forEachDiagnostic(state, (diagnostic) => {
        diagnostics.push(diagnostic);
    });
    return diagnostics;
}

function parseCradleLink(
    node: { from: number; to: number; node: SyntaxNode },
    text: string,
    cursorPos: number,
    diagnostics: Diagnostic[],
    entryColors: Map<string, string>,
    navigate: (url: string) => void,
): Range<Decoration> | null {
    const from = node.from;
    const to = node.to;
    const linkText = text.slice(from, to);

    let hasPrefix = false;
    let type = '';
    let name = '';
    let alias = '';
    let timestamp = '';
    let widgetEnd = to;
    let timestampFrom = to;
    let timestampTo = to;

    let child = node.node.firstChild;
    while (child) {
        const childText = text.slice(child.from, child.to);
        if (child.type.name === 'CradleLinkPrefix') {
            hasPrefix = true;
        } else if (child.type.name === 'CradleLinkType') {
            type = childText;
        } else if (child.type.name === 'CradleLinkValue') {
            name = childText;
        } else if (child.type.name === 'CradleLinkAlias') {
            alias = childText;
        } else if (child.type.name === 'CradleLinkTimestamp') {
            timestamp = childText;
            timestampFrom = child.from;
            timestampTo = child.to;
            widgetEnd = child.to;
        }
        child = child.nextSibling;
    }

    if (
        (cursorPos >= from && cursorPos <= to) ||
        (timestamp && cursorPos >= timestampFrom && cursorPos <= timestampTo)
    ) {
        return null;
    }

    if (!type && !name) {
        return null;
    }

    const hasLintIssues = diagnostics.some(
        (diagnostic) => diagnostic.from < widgetEnd && diagnostic.to > from,
    );

    if (hasLintIssues) {
        return null;
    }

    const color = entryColors.get(type) || '#FF8C00';

    return Decoration.replace({
        widget: new CradleLinkWidget(
            type,
            name,
            alias,
            color,
            navigate,
            linkText,
            timestamp,
            hasPrefix,
        ),
        inclusive: false,
        block: false,
    }).range(from, widgetEnd);
}

function createColorMarks(
    node: { from: number; to: number; node: SyntaxNode },
    text: string,
    cursorPos: number,
    diagnostics: Diagnostic[],
    entryColors: Map<string, string>,
    sourceMode: boolean,
): Range<Decoration>[] {
    const marks: Range<Decoration>[] = [];
    const from = node.from;
    const to = node.to;

    let type = '';
    let linkEnd = to;
    let timestampFrom = to;
    let timestampTo = to;
    let hasPrefix = false;
    let child = node.node.firstChild;

    while (child) {
        if (child.type.name === 'CradleLinkPrefix') {
            hasPrefix = true;
        } else if (child.type.name === 'CradleLinkType') {
            type = text.slice(child.from, child.to);
        } else if (child.type.name === 'CradleLinkTimestamp') {
            timestampFrom = child.from;
            timestampTo = child.to;
            linkEnd = child.to;
        }
        child = child.nextSibling;
    }

    const isInLink = cursorPos >= from && cursorPos <= to;
    const isInTimestamp =
        linkEnd > to && cursorPos >= timestampFrom && cursorPos <= timestampTo;

    const hasLintIssues = diagnostics.some(
        (diagnostic) => diagnostic.from < linkEnd && diagnostic.to > from,
    );

    if (isInLink || isInTimestamp || hasLintIssues || sourceMode) {
        if (!type) {
            return marks;
        }

        const color = entryColors.get(type) || '#FF8C00';

        marks.push(
            Decoration.mark({
                attributes: {
                    style: `color: ${color} !important;`,
                },
            }).range(from, linkEnd),
        );

        child = node.node.firstChild;
        while (child) {
            if (child.type.name === 'CradleLinkPrefix' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: {
                            style: `color: ${color} !important; opacity: 0.8; font-weight: 600;`,
                        },
                    }).range(child.from, child.to),
                );
            } else if (
                child.type.name === 'CradleLinkType' &&
                child.from !== child.to
            ) {
                marks.push(
                    Decoration.mark({
                        attributes: {
                            style: `color: ${color} !important; opacity: 0.9;`,
                        },
                    }).range(child.from, child.to),
                );
            } else if (
                child.type.name === 'CradleLinkValue' &&
                child.from !== child.to
            ) {
                marks.push(
                    Decoration.mark({
                        attributes: {
                            style: `color: ${color} !important; font-weight: 600;`,
                        },
                    }).range(child.from, child.to),
                );
            } else if (
                child.type.name === 'CradleLinkAlias' &&
                child.from !== child.to
            ) {
                marks.push(
                    Decoration.mark({
                        attributes: {
                            style: `color: ${color} !important; font-style: italic;`,
                        },
                    }).range(child.from, child.to),
                );
            } else if (
                child.type.name === 'CradleLinkTimestamp' &&
                child.from !== child.to
            ) {
                marks.push(
                    Decoration.mark({
                        attributes: {
                            style: `color: ${color} !important; font-style: italic; opacity: 0.7; text-decoration: underline; font-size: 0.85em;`,
                        },
                    }).range(child.from, child.to),
                );
            }
            child = child.nextSibling;
        }
    }

    return marks;
}
