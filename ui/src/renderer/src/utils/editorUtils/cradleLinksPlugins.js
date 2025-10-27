import { forEachDiagnostic } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { CradleLinkWidget } from './cradleLinkWidget';

/**
 * Creates a ViewPlugin to render CradleLink nodes as widgets
 */
export function cradleLinksPlugin(entryColors, navigate, sourceMode) {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.entryColors = entryColors;
            this.navigate = navigate;
            this.sourceMode = sourceMode;
            this.decorations = this.buildDecorations(view);
        }

        update(update) {
            const oldDiagnosticCount = countDiagnostics(update.startState);
            const newDiagnosticCount = countDiagnostics(update.state);
            const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

            if (update.docChanged || update.viewportChanged || update.selectionSet || diagnosticsChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view) {
            if (this.sourceMode) {
                return Decoration.set([], true);
            }

            const widgets = [];
            const doc = view.state.doc;
            const text = doc.toString();
            const selection = view.state.selection.main;
            const cursorPos = selection.head;
            const tree = syntaxTree(view.state);
            const diagnostics = collectDiagnostics(view.state);

            tree.iterate({
                enter: (node) => {
                    if (node.type.name === 'CradleLink') {
                        const linkInfo = parseCradleLink(node, text, cursorPos, diagnostics, this.entryColors, this.navigate);
                        if (linkInfo) {
                            widgets.push(linkInfo);
                        }
                    }
                }
            });

            return Decoration.set(widgets, true);
        }
    }, {
        decorations: v => v.decorations
    });
}

/**
 * Creates a ViewPlugin to style CradleLink text when uncollapsed
 */
export function cradleLinkColorPlugin(entryColors, sourceMode) {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.entryColors = entryColors;
            this.sourceMode = sourceMode;
            this.decorations = this.buildDecorations(view);
        }

        update(update) {
            const oldDiagnosticCount = countDiagnostics(update.startState);
            const newDiagnosticCount = countDiagnostics(update.state);
            const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

            if (update.docChanged || update.viewportChanged || update.selectionSet || diagnosticsChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view) {
            const marks = [];
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
                            this.sourceMode
                        );
                        marks.push(...colorMarks);
                    }
                }
            });

            return Decoration.set(marks, true);
        }
    }, {
        decorations: v => v.decorations
    });
}

function countDiagnostics(state) {
    let count = 0;
    forEachDiagnostic(state, () => { count++; });
    return count;
}

function collectDiagnostics(state) {
    const diagnostics = [];
    forEachDiagnostic(state, (diagnostic) => {
        diagnostics.push(diagnostic);
    });
    return diagnostics;
}

function parseCradleLink(node, text, cursorPos, diagnostics, entryColors, navigate) {
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

    if ((cursorPos >= from && cursorPos <= to) ||
        (timestamp && cursorPos >= timestampFrom && cursorPos <= timestampTo)) {
        return null;
    }

    if (!type && !name) {
        return null;
    }

    const hasLintIssues = diagnostics.some(diagnostic =>
        diagnostic.from < widgetEnd && diagnostic.to > from
    );

    if (hasLintIssues) {
        return null;
    }

    const color = entryColors.get(type);

    return Decoration.replace({
        widget: new CradleLinkWidget(type, name, alias, color, navigate, linkText, timestamp, hasPrefix),
        inclusive: false,
        block: false,
    }).range(from, widgetEnd);
}

function createColorMarks(node, text, cursorPos, diagnostics, entryColors, sourceMode) {
    const marks = [];
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
    const isInTimestamp = linkEnd > to && cursorPos >= timestampFrom && cursorPos <= timestampTo;

    const hasLintIssues = diagnostics.some(diagnostic =>
        diagnostic.from < linkEnd && diagnostic.to > from
    );

    if (isInLink || isInTimestamp || hasLintIssues || sourceMode) {
        if (!type) {
            return marks;
        }

        const color = entryColors.get(type) || '#FF8C00';

        marks.push(
            Decoration.mark({
                attributes: {
                    style: `color: ${color} !important;`
                }
            }).range(from, linkEnd)
        );

        child = node.node.firstChild;
        while (child) {
            if (child.type.name === 'CradleLinkPrefix' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: { style: `color: ${color} !important; opacity: 0.8; font-weight: 600;` }
                    }).range(child.from, child.to)
                );
            } else if (child.type.name === 'CradleLinkType' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: { style: `color: ${color} !important; opacity: 0.9;` }
                    }).range(child.from, child.to)
                );
            } else if (child.type.name === 'CradleLinkValue' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: { style: `color: ${color} !important; font-weight: 600;` }
                    }).range(child.from, child.to)
                );
            } else if (child.type.name === 'CradleLinkAlias' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: { style: `color: ${color} !important; font-style: italic;` }
                    }).range(child.from, child.to)
                );
            } else if (child.type.name === 'CradleLinkTimestamp' && child.from !== child.to) {
                marks.push(
                    Decoration.mark({
                        attributes: { style: `color: ${color} !important; font-style: italic; opacity: 0.7; text-decoration: underline; font-size: 0.85em;` }
                    }).range(child.from, child.to)
                );
            }
            child = child.nextSibling;
        }
    }

    return marks;
}
