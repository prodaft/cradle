import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import type { NavigateOptions } from '@tanstack/react-router';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// Extend MarkdownIt type to include custom properties
interface MarkdownItWithHandlers extends MarkdownIt {
    cradleLinkHandlers?: Array<{
        linkId: string;
        url: string;
        navigate: (url: string, options?: NavigateOptions) => void;
    }>;
}

/**
 * Markdown-it plugin for cradle links
 * Handles [[type:value|alias]]@timestamp syntax
 */
function cradleLinksPlugin(
    md: MarkdownItWithHandlers,
    entryColors: Map<string, string>,
    navigate: (url: string, options?: NavigateOptions) => void
) {
    // Inline rule for cradle links
    md.inline.ruler.before('link', 'cradle_link', (state, silent) => {
        const start = state.pos;

        // Check if we start with [[
        if (state.src.charCodeAt(start) !== 0x5B || state.src.charCodeAt(start + 1) !== 0x5B) {
            return false;
        }

        // Try to match the full pattern: [[type:value|alias]]@timestamp
        const match = state.src.substring(start).match(/^\[\[([^:\]]+):([^\]|]+)(?:\|([^\]]+))?\]\](?:@(\S+))?/);

        if (!match) {
            return false;
        }

        if (!silent) {
            const linkType = match[1];
            const value = match[2];
            const alias = match[3];
            const timestamp = match[4];
            const color = entryColors.get(linkType) || '#FF8C00';

            const token = state.push('cradle_link', '', 0);
            token.meta = { linkType, value, alias, timestamp, color };
        }

        state.pos += match[0].length;
        return true;
    });

    // Renderer for cradle links
    md.renderer.rules.cradle_link = (tokens, idx) => {
        const token = tokens[idx];
        const { linkType, value, alias, timestamp, color } = token.meta;
        const displayText = alias || value;
        const url = `/dashboards/${encodeURIComponent(linkType)}/${encodeURIComponent(value)}/`;

        // Create a unique class name for this link
        const linkId = `cradle-link-${Math.random().toString(36).substr(2, 9)}`;

        let html = `<span class="${linkId}" style="color: ${color}; text-decoration: underline; cursor: pointer;">${md.utils.escapeHtml(displayText)}</span>`;

        if (timestamp) {
            html += `<span style="color: ${color}; font-size: 0.85em; opacity: 0.7; margin-left: 0.2em;">@${md.utils.escapeHtml(timestamp)}</span>`;
        }

        // Store the navigation handler for later attachment
        if (!md.cradleLinkHandlers) {
            md.cradleLinkHandlers = [];
        }
        md.cradleLinkHandlers.push({ linkId, url, navigate });

        return html;
    };
}

/**
 * Widget to render markdown tables as HTML tables
 */
class TableWidget extends WidgetType {
    rows: string[][];
    headers: string[];
    alignments: ('left' | 'center' | 'right')[];
    entryColors: Map<string, string>;
    navigate: (url: string, options?: NavigateOptions) => void;

    constructor(
        rows: string[][],
        headers: string[],
        alignments: ('left' | 'center' | 'right')[],
        entryColors: Map<string, string>,
        navigate: (url: string, options?: NavigateOptions) => void
    ) {
        super();
        this.rows = rows;
        this.headers = headers;
        this.alignments = alignments;
        this.entryColors = entryColors;
        this.navigate = navigate;
    }

    eq(other: TableWidget): boolean {
        return (
            JSON.stringify(this.rows) === JSON.stringify(other.rows) &&
            JSON.stringify(this.headers) === JSON.stringify(other.headers) &&
            JSON.stringify(this.alignments) === JSON.stringify(other.alignments)
        );
    }

    toDOM(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'block';
        wrapper.style.width = '100%';

        const table = document.createElement('table');

        // Create markdown-it instance with cradle links plugin
        const md = new MarkdownIt({ html: false, linkify: true }) as MarkdownItWithHandlers;
        md.cradleLinkHandlers = [];
        cradleLinksPlugin(md, this.entryColors, this.navigate);

        // Create header
        if (this.headers.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            this.headers.forEach((header, idx) => {
                const th = document.createElement('th');
                const rendered = md.renderInline(header.trim());
                const sanitized = DOMPurify.sanitize(rendered);
                th.innerHTML = sanitized;

                if (this.alignments[idx]) {
                    th.style.textAlign = this.alignments[idx];
                }

                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);
        }

        // Create body
        if (this.rows.length > 0) {
            const tbody = document.createElement('tbody');

            this.rows.forEach((row) => {
                const tr = document.createElement('tr');

                row.forEach((cell, idx) => {
                    const td = document.createElement('td');
                    const rendered = md.renderInline(cell.trim());
                    const sanitized = DOMPurify.sanitize(rendered);
                    td.innerHTML = sanitized;

                    if (this.alignments[idx]) {
                        td.style.textAlign = this.alignments[idx];
                    }

                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
        }

        wrapper.appendChild(table);

        // Attach event handlers for cradle links
        if (md.cradleLinkHandlers && md.cradleLinkHandlers.length > 0) {
            requestAnimationFrame(() => {
                md.cradleLinkHandlers!.forEach(({ linkId, url, navigate }) => {
                    const link = wrapper.querySelector(`.${linkId}`);
                    if (link) {
                        link.addEventListener('click', (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(url, {});
                        });
                    }
                });
            });
        }

        return wrapper;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Parse alignment from delimiter row (e.g., "|:---|:---:|---:|")
 */
function parseAlignment(delimiter: string): ('left' | 'center' | 'right')[] {
    const cells = delimiter.split('|').filter(c => c.trim());
    return cells.map(cell => {
        const trimmed = cell.trim();
        const hasLeft = trimmed.startsWith(':');
        const hasRight = trimmed.endsWith(':');

        if (hasLeft && hasRight) return 'center';
        if (hasRight) return 'right';
        return 'left';
    });
}

/**
 * Parse a table from markdown text
 */
function parseTable(text: string): { headers: string[]; rows: string[][]; alignments: ('left' | 'center' | 'right')[] } | null {
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) return null;

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split('|').filter(h => h.trim()).map(h => h.trim());

    // Parse alignment from delimiter row
    const delimiterLine = lines[1];
    const alignments = parseAlignment(delimiterLine);

    // Parse body rows
    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length > 0) {
            rows.push(cells);
        }
    }

    return { headers, rows, alignments };
}

/**
 * Build table decorations for the current editor state
 */
function buildTableDecorations(
    state: EditorState,
    sourceMode: boolean,
    entryColors: Map<string, string>,
    navigate: (url: string, options?: NavigateOptions) => void
): DecorationSet {
    // Don't render widgets in source mode
    if (sourceMode) {
        return Decoration.none;
    }

    const widgets: Range<Decoration>[] = [];
    const doc = state.doc;
    const text = doc.toString();
    const selection = state.selection.main;
    const cursorPos = selection.head;
    const tree = syntaxTree(state);

    tree.iterate({
        enter: (node) => {
            if (node.type.name === 'Table') {
                const from = node.from;
                const to = node.to;

                // Don't render widget if cursor is inside the table
                if (cursorPos >= from && cursorPos <= to) {
                    return;
                }

                const tableText = text.slice(from, to);
                const parsed = parseTable(tableText);

                if (parsed) {
                    widgets.push(
                        Decoration.replace({
                            widget: new TableWidget(
                                parsed.rows,
                                parsed.headers,
                                parsed.alignments,
                                entryColors,
                                navigate
                            ),
                        }).range(from, to)
                    );
                }
            }
        },
    });

    return Decoration.set(widgets, true);
}

/**
 * Creates a StateField to render markdown tables as HTML tables
 */
export function tablePlugin(
    entryColors: Map<string, string>,
    navigate: (url: string, options?: NavigateOptions) => void,
    sourceMode: boolean
) {
    return StateField.define<DecorationSet>({
        create(state) {
            return buildTableDecorations(state, sourceMode, entryColors, navigate);
        },
        update(decorations, tr) {
            if (tr.docChanged || tr.selection) {
                return buildTableDecorations(tr.state, sourceMode, entryColors, navigate);
            }
            return decorations.map(tr.changes);
        },
        provide(field) {
            return EditorView.decorations.from(field);
        },
    });
}
