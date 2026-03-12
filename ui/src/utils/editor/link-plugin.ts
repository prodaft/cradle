import { syntaxTree } from '@codemirror/language';
import { Diagnostic, forEachDiagnostic } from '@codemirror/lint';
import { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { SyntaxNode } from '@lezer/common';
import { WarningCircleIcon } from '@phosphor-icons/react';
import type { NavigateOptions } from '@tanstack/react-router';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Widget to render Cradle links as clickable elements in the editor
 */
class CradleLinkWidget extends WidgetType {
    type: string;
    name: string;
    alias: string;
    color: string;
    url: string;
    navigate: (url: string, options?: NavigateOptions) => void;
    fullText: string;
    timestamp: string;
    hasPrefix: boolean;
    lintIssues: Diagnostic[];

    constructor(
        type: string,
        name: string,
        alias: string,
        color: string,
        navigate: (url: string, options?: NavigateOptions) => void,
        fullText: string,
        timestamp: string,
        hasPrefix: boolean,
        lintIssues: Diagnostic[],
    ) {
        super();
        this.type = type;
        this.name = name;
        this.alias = alias;
        this.color = color || 'var(--pm-link-color)';
        this.url = `/dashboards/${encodeURIComponent(this.type)}/${encodeURIComponent(this.name)}/`;
        this.navigate = navigate;
        this.fullText = fullText;
        this.timestamp = timestamp;
        this.hasPrefix = hasPrefix;
        this.lintIssues = lintIssues;
    }

    eq(other: CradleLinkWidget): boolean {
        return (
            other.type === this.type &&
            other.name === this.name &&
            other.alias === this.alias &&
            other.color === this.color &&
            other.timestamp === this.timestamp &&
            other.hasPrefix === this.hasPrefix &&
            other.lintIssues.length === this.lintIssues.length
        );
    }

    toDOM(_view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'cradle-link-widget-container';

        const linkSpan = this.createLinkElement();
        container.appendChild(linkSpan);

        if (this.timestamp) {
            const timestampSpan = this.createTimestampElement();
            container.appendChild(timestampSpan);
        }

        if (this.lintIssues.length) {
            const warningSpan = this.createLintWarningElement();
            container.appendChild(warningSpan);
        }

        return container;
    }

    private attachLinkBehavior(el: HTMLElement, url: string): void {
        el.setAttribute('data-link-url', url);
        el.setAttribute('data-link-full-text', this.fullText);

        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigate(url);
        });

        el.addEventListener('mouseenter', () => {
            el.style.opacity = '0.8';
        });

        el.addEventListener('mouseleave', () => {
            el.style.opacity = '1';
        });
    }

    createLinkElement(): HTMLSpanElement {
        const linkSpan = document.createElement('span');
        const displayName = this.alias || this.name;
        const url = this.url;
        const a = document.createElement('a');
        const path = document.location.pathname;
        a.href = `${path}#${url}`;

        a.textContent = displayName;
        a.style.color = this.color;
        linkSpan.style.color = this.color;
        linkSpan.style.cursor = 'pointer';
        linkSpan.style.textDecoration = 'underline';
        linkSpan.className = 'cradle-link-widget';
        linkSpan.appendChild(a);

        this.attachLinkBehavior(linkSpan, url);

        return linkSpan;
    }

    createTimestampElement(): HTMLSpanElement {
        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = this.timestamp;
        timestampSpan.style.color = this.color;
        timestampSpan.style.marginLeft = '4px';
        timestampSpan.style.textDecoration = 'underline';
        timestampSpan.style.cursor = 'pointer';
        timestampSpan.className = 'cradle-link-timestamp';
        this.attachLinkBehavior(timestampSpan, this.url);
        return timestampSpan;
    }

    createLintWarningElement(): HTMLSpanElement {
        const warningSpan = document.createElement('span');
        warningSpan.className = 'cradle-link-lint-warning';
        warningSpan.setAttribute('aria-label', 'Lint issues in link');
        warningSpan.innerHTML = renderToStaticMarkup(
            createElement(WarningCircleIcon, { size: 12, weight: 'fill' }),
        );
        return warningSpan;
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
 * Adds heading-level classes to lines so widgets inherit heading typography.
 */
export function headingLineClassPlugin(sourceMode: boolean) {
    return ViewPlugin.fromClass(
        class {
            sourceMode: boolean;
            decorations: ReturnType<typeof Decoration.set>;

            constructor(view: EditorView) {
                this.sourceMode = sourceMode;
                this.decorations = this.buildDecorations(view);
            }

            update(update: {
                docChanged: boolean;
                viewportChanged: boolean;
                view: EditorView;
            }) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                if (this.sourceMode) {
                    return Decoration.set([], true);
                }

                const decorations: Range<Decoration>[] = [];
                const seenLines = new Set<number>();
                const doc = view.state.doc;
                const tree = syntaxTree(view.state);

                tree.iterate({
                    enter: (node) => {
                        const level = headingLevelFromNodeName(node.type.name);
                        if (!level) return;
                        const line = doc.lineAt(node.from);
                        if (seenLines.has(line.from)) return;
                        seenLines.add(line.from);
                        decorations.push(
                            Decoration.line({
                                class: `cm-heading-${level}`,
                            }).range(line.from),
                        );
                    },
                });

                return Decoration.set(decorations, true);
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

function headingLevelFromNodeName(name: string): number | null {
    const atxMatch = /^ATXHeading([1-6])$/.exec(name);
    if (atxMatch) {
        return Number(atxMatch[1]);
    }
    const setextMatch = /^SetextHeading([1-2])$/.exec(name);
    if (setextMatch) {
        return Number(setextMatch[1]);
    }
    return null;
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

    if (to > text.length) {
        return null;
    }

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

    if (!type || !name) {
        return null;
    }

    const lintIssues = diagnostics.filter(
        (diagnostic) => diagnostic.from < widgetEnd && diagnostic.to > from,
    );

    const color = entryColors.get(type) || 'var(--pm-link-color)';

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
            lintIssues,
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

    if (to > text.length) {
        return marks;
    }

    let type = '';
    let linkEnd = to;
    let timestampFrom = to;
    let timestampTo = to;
    let child = node.node.firstChild;

    while (child) {
        if (child.type.name === 'CradleLinkType') {
            type = text.slice(child.from, child.to);
        } else if (child.type.name === 'CradleLinkTimestamp') {
            timestampFrom = child.from;
            timestampTo = child.to;
            linkEnd = child.to;
        }
        child = child.nextSibling;
    }

    const isInLink = cursorPos >= from && cursorPos <= to;
    const hasTimestamp = timestampFrom !== timestampTo;
    const isInTimestamp =
        hasTimestamp && cursorPos >= timestampFrom && cursorPos <= timestampTo;

    const hasLintIssues = diagnostics.some(
        (diagnostic) => diagnostic.from < linkEnd && diagnostic.to > from,
    );

    if (isInLink || isInTimestamp || hasLintIssues || sourceMode) {
        if (!type) {
            return marks;
        }

        const color = entryColors.get(type) || 'var(--pm-link-color)';

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
