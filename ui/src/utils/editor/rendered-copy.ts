import { foldedRanges } from '@codemirror/language';
import { EditorView, type WidgetType } from '@codemirror/view';

/**
 * A widget can say what it reads as when copied; otherwise its DOM text is used.
 */
export interface CopyableWidget {
    copyText(): string;
}

// Prosemark hides rendered syntax with these mark classes (font-size 0 / opacity 0).
const HIDDEN_TOKEN_CLASSES = ['cm-hidden-token', 'cm-transparent-token'];

const BLOCK_ELEMENTS = new Set([
    'address',
    'article',
    'blockquote',
    'dd',
    'div',
    'dl',
    'dt',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'li',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul',
]);

const SKIPPED_ELEMENTS = new Set(['button', 'script', 'style', 'svg']);

function domText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.localName;
    if (SKIPPED_ELEMENTS.has(tag) || el.getAttribute('aria-hidden') === 'true')
        return '';
    if (tag === 'img') return el.getAttribute('alt') ?? '';
    if (tag === 'br') return '\n';
    if (tag === 'table') {
        return Array.from(el.querySelectorAll('tr'))
            .map((row) =>
                Array.from(row.children)
                    .map((cell) => domText(cell).trim())
                    .join('\t'),
            )
            .join('\n');
    }
    let text = '';
    for (const child of Array.from(el.childNodes)) {
        const part = domText(child);
        if (!part) continue;
        const block =
            child.nodeType === Node.ELEMENT_NODE &&
            BLOCK_ELEMENTS.has((child as Element).localName);
        if (block && text && !text.endsWith('\n')) text += '\n';
        text += part;
        if (block && !text.endsWith('\n')) text += '\n';
    }
    return text;
}

function widgetText(view: EditorView, widget: WidgetType): string {
    const copyable = widget as Partial<CopyableWidget>;
    if (typeof copyable.copyText === 'function') return copyable.copyText();
    return domText(widget.toDOM(view)).replace(/\n+$/, '');
}

interface Span {
    from: number;
    to: number;
}

interface Replaced extends Span {
    widget?: WidgetType;
}

/**
 * The text of [from, to] as the rendered view shows it: syntax prosemark hides is
 * dropped and replaced ranges (links, tables, emoji, ...) read as their widget.
 * Built from decorations rather than the DOM, which only holds the viewport.
 */
function renderedText(view: EditorView, from: number, to: number): string {
    const { state } = view;
    const folded = foldedRanges(state);
    const replaced: Replaced[] = [];
    const hidden: Span[] = [];

    for (const source of state.facet(EditorView.decorations)) {
        const set = typeof source === 'function' ? source(view) : source;
        set.between(from, to, (f, t, deco) => {
            if (t <= from || f >= to) return;
            if (deco.point) {
                // Inserted widgets (code block labels, copy buttons) and line
                // decorations add no text.
                if (f === t) return;
                // A fold only collapses the view; copy what it hides.
                let isFold = false;
                folded.between(f, t, (a, b) => {
                    if (a === f && b === t) isFold = true;
                });
                if (isFold) return;
                replaced.push({ from: f, to: t, widget: deco.spec.widget });
            } else {
                const classes = String(deco.spec.class ?? '').split(/\s+/);
                if (HIDDEN_TOKEN_CLASSES.some((c) => classes.includes(c))) {
                    hidden.push({ from: f, to: t });
                }
            }
        });
    }

    hidden.sort((a, b) => a.from - b.from);
    // Outermost replacement wins where they nest.
    replaced.sort((a, b) => a.from - b.from || b.to - a.to);

    // Pieces of [a, b) in order; `hidden` marks syntax that renders as nothing.
    const pieces = (a: number, b: number) => {
        const out: { text: string; hidden: boolean }[] = [];
        let pos = a;
        for (const r of replaced) {
            if (r.to <= pos || r.from >= b) continue;
            if (r.from > pos) out.push(...visiblePieces(pos, r.from));
            const shown = r.widget ? widgetText(view, r.widget) : '';
            const source = state.sliceDoc(r.from, r.to);
            // Widgets standing in for whitespace (fixed-width tabs) keep it.
            const text = shown || (/^\s+$/.test(source) ? source : '');
            out.push({ text, hidden: !text });
            pos = r.to;
        }
        if (pos < b) out.push(...visiblePieces(pos, b));
        return out;
    };

    const visiblePieces = (a: number, b: number) => {
        const out: { text: string; hidden: boolean }[] = [];
        let pos = a;
        for (const h of hidden) {
            if (h.to <= pos || h.from >= b) continue;
            if (h.from > pos)
                out.push({ text: state.sliceDoc(pos, h.from), hidden: false });
            out.push({ text: '', hidden: true });
            pos = Math.max(pos, h.to);
        }
        if (pos < b) out.push({ text: state.sliceDoc(pos, b), hidden: false });
        return out;
    };

    // Line by line, so syntax-only lines (code fences) vanish instead of leaving
    // blank lines, and space after hidden line-start syntax (`> `, `- [x] `) goes.
    // A replacement spanning lines (tables, HTML blocks) extends its chunk.
    const lines: string[] = [];
    let pos = from;
    while (pos <= to) {
        let end = Math.min(state.doc.lineAt(pos).to, to);
        for (const r of replaced) {
            if (r.from < end && r.to > end) {
                end = Math.min(state.doc.lineAt(r.to).to, to);
            }
        }
        const parts = pieces(pos, end);
        const firstShown = parts.findIndex((p) => p.hidden || p.text.trim());
        let text = parts.map((p) => p.text).join('');
        if (parts[firstShown]?.hidden) text = text.trimStart();
        const source = state.sliceDoc(pos, end);
        if (!(text.trim() === '' && source.trim() !== '')) lines.push(text);
        pos = end + 1;
    }
    return lines.join(state.lineBreak);
}

/**
 * In reading (read-only) mode, copy what is rendered instead of the markdown
 * source. Editing mode keeps CodeMirror's default of copying the source.
 */
export const renderedCopy = EditorView.domEventHandlers({
    copy: copyRendered,
    cut: copyRendered,
});

function copyRendered(event: ClipboardEvent, view: EditorView): boolean {
    if (!view.state.readOnly || !event.clipboardData) return false;
    // Like CodeMirror's own handler: a DOM selection reaching outside the editor
    // belongs to the page, so leave it to the browser.
    const domSelection = view.dom.ownerDocument.getSelection();
    const anchor = domSelection?.anchorNode;
    const focus = domSelection?.focusNode;
    if (
        anchor &&
        focus &&
        !(view.contentDOM.contains(anchor) && view.contentDOM.contains(focus))
    ) {
        return false;
    }
    const ranges = view.state.selection.ranges.filter((r) => !r.empty);
    event.preventDefault();
    // An empty selection copies nothing (CodeMirror would copy the source line).
    if (ranges.length === 0) return true;
    const text = ranges
        .map((r) => renderedText(view, r.from, r.to))
        .join(view.state.lineBreak);
    event.clipboardData.setData('text/plain', text);
    return true;
}
