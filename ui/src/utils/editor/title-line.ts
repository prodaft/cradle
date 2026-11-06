import { GutterClass } from '@/utils/editor/link-plugin';
import { foldable, foldEffect } from '@codemirror/language';
import {
    EditorState,
    type Line,
    Prec,
    type Range,
    RangeSet,
    type StateEffect,
    StateField,
    type Text,
    Transaction,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    gutterLineClass,
    keymap,
    WidgetType,
} from '@codemirror/view';

/** The H1 mark that makes the title line a heading; hidden in the live editor. */
const TITLE_MARK = '# ';

/**
 * The note's title line: the first non-blank line after the YAML frontmatter, or
 * the line right after it while the rest is blank. Null while the frontmatter is
 * still open.
 */
function titleLine(doc: Text): Line | null {
    let first = 1;
    if (doc.line(1).text === '---') {
        first = 0;
        for (let i = 2; i <= doc.lines; i++) {
            if (doc.line(i).text === '---') {
                first = i + 1;
                break;
            }
        }
        if (!first || first > doc.lines) return null;
    }
    for (let i = first; i <= doc.lines; i++) {
        const line = doc.line(i);
        if (line.text.trim() !== '') return line;
    }
    return doc.line(first);
}

/** The number of the note's title line when it is an H1, which renders as the title. */
export function titleHeadingNumber(doc: Text): number | null {
    const line = titleLine(doc);
    return line?.text.startsWith(TITLE_MARK) ? line.number : null;
}

class TitlePlaceholderWidget extends WidgetType {
    eq() {
        return true;
    }

    toDOM() {
        const span = document.createElement('span');
        span.className = 'cm-title-placeholder';
        span.textContent = 'Untitled';
        return span;
    }
}

const hiddenTitleMark = Decoration.replace({});
const titlePlaceholder = Decoration.widget({
    widget: new TitlePlaceholderWidget(),
    side: 1,
});

function buildDecorations(state: EditorState): DecorationSet {
    const line = titleLine(state.doc);
    if (!line) return Decoration.none;

    const hasMark = line.text.startsWith(TITLE_MARK);
    const decorations: Range<Decoration>[] = [];
    if (hasMark) {
        decorations.push(
            hiddenTitleMark.range(line.from, line.from + TITLE_MARK.length),
        );
    }
    if (
        !state.readOnly &&
        line.text.slice(hasMark ? TITLE_MARK.length : 0).trim() === ''
    ) {
        decorations.push(titlePlaceholder.range(line.to));
    }
    return Decoration.set(decorations, true);
}

const titleDecorations = StateField.define<DecorationSet>({
    create: buildDecorations,
    update(decorations, tr) {
        if (tr.docChanged || tr.startState.readOnly !== tr.state.readOnly) {
            return buildDecorations(tr.state);
        }
        return decorations;
    },
    provide: (field) => [
        EditorView.decorations.from(field),
        // The cursor steps over the hidden mark instead of landing inside it, and
        // Backspace at the start of the title removes the whole mark.
        EditorView.atomicRanges.of((view) => view.state.field(field)),
    ],
});

/**
 * Keeps the title an H1 while typing: text typed at the start of a blank or H1
 * title line gets the mark in front of it, also when typed in front of the hidden
 * mark. Text starting with `#` (another heading level), `-` (frontmatter, a list)
 * or whitespace is left as typed, and a title whose mark was deleted stays plain.
 * A cursor left at the start of the title is moved past its mark.
 */
const titleInput = EditorState.transactionFilter.of((tr) => {
    const line = titleLine(tr.state.doc);
    if (!line) return tr;

    // Composition (IME) input is left alone; inserting text next to it can break it.
    if (tr.isUserEvent('input.type') && !tr.isUserEvent('input.type.compose')) {
        const changes: { fromA: number; fromB: number; toB: number }[] = [];
        tr.changes.iterChanges((fromA, _toA, fromB, toB) => {
            changes.push({ fromA, fromB, toB });
        });
        const change = changes[0];
        if (changes.length !== 1 || !change) return tr;
        const { fromA, fromB, toB } = change;
        const doc = tr.state.doc;
        const typed = doc.sliceString(fromB, toB);
        if (fromB !== line.from || !typed || /^[#\-\s]/.test(typed)) return tr;

        const insertMark = { from: fromB, insert: TITLE_MARK };
        if (doc.sliceString(toB, toB + TITLE_MARK.length) === TITLE_MARK) {
            return [
                tr,
                {
                    changes: [insertMark, { from: toB, to: toB + TITLE_MARK.length }],
                    sequential: true,
                },
            ];
        }
        const before = tr.startState.doc.lineAt(fromA).text;
        if (before.trim() === '' || before.startsWith(TITLE_MARK)) {
            return [tr, { changes: insertMark, sequential: true }];
        }
        return tr;
    }

    if (tr.selection && !tr.docChanged && line.text.startsWith(TITLE_MARK)) {
        const { main } = tr.selection;
        if (main.empty && main.head === line.from) {
            return [
                tr,
                {
                    selection: { anchor: line.from + TITLE_MARK.length },
                    sequential: true,
                },
            ];
        }
    }
    return tr;
});

/**
 * CodeMirror's fold all, but stepping into the title's section instead of over
 * it: the title's own fold is dropped (see titleNoFold), and everything below it
 * would otherwise be skipped as nested in that fold.
 */
const foldAllBelowTitle = (view: EditorView): boolean => {
    const { state } = view;
    const title = titleHeadingNumber(state.doc);
    const titleTo = title === null ? -1 : state.doc.line(title).to;
    const effects: StateEffect<unknown>[] = [];
    for (let pos = 0; pos < state.doc.length;) {
        const line = view.lineBlockAt(pos);
        const range = line.to === titleTo ? null : foldable(state, line.from, line.to);
        if (range) effects.push(foldEffect.of(range));
        pos = (range ? view.lineBlockAt(range.to) : line).to + 1;
    }
    if (effects.length) view.dispatch({ effects });
    return effects.length > 0;
};

/**
 * Fold all that skips the title (see foldAllBelowTitle), and Left at the start of
 * the title continuing to the previous line; the default would stop before the
 * hidden mark, where the filter above puts the cursor back.
 */
const titleKeymap = keymap.of([
    { key: 'Ctrl-Alt-[', run: foldAllBelowTitle },
    {
        key: 'ArrowLeft',
        run: (view) => {
            const line = titleLine(view.state.doc);
            const { main } = view.state.selection;
            if (
                !line ||
                line.from === 0 ||
                !line.text.startsWith(TITLE_MARK) ||
                !main.empty ||
                main.head !== line.from + TITLE_MARK.length
            ) {
                return false;
            }
            view.dispatch({
                selection: { anchor: line.from - 1 },
                scrollIntoView: true,
                userEvent: 'select',
            });
            return true;
        },
    },
]);

const titleGutterClass = new GutterClass('cm-gutter-title');

/**
 * The title doesn't fold: its fold marker is hidden, and folding it anyway (a
 * click on its gutter row, the fold key) is dropped from the transaction, along
 * with the fold's screen reader announcement. CodeMirror never offers a line as
 * not foldable, and an unfold in the same transaction would not help, as folds
 * are applied after unfolds.
 */
const titleNoFold = [
    gutterLineClass.compute(['doc'], (state) => {
        const number = titleHeadingNumber(state.doc);
        if (number === null) return RangeSet.empty;
        return RangeSet.of(titleGutterClass.range(state.doc.line(number).from));
    }),
    EditorState.transactionFilter.of((tr) => {
        if (!tr.effects.length) return tr;
        const number = titleHeadingNumber(tr.state.doc);
        if (number === null) return tr;
        const line = tr.state.doc.line(number);
        const titleFold = (e: StateEffect<unknown>) =>
            e.is(foldEffect) && e.value.from >= line.from && e.value.from <= line.to;
        if (!tr.effects.some(titleFold)) return tr;
        const effects = tr.effects.filter(
            (e) => !titleFold(e) && !e.is(EditorView.announce),
        );
        const userEvent = tr.annotation(Transaction.userEvent);
        return {
            changes: tr.changes,
            selection: tr.selection,
            effects,
            scrollIntoView: tr.scrollIntoView,
            annotations: userEvent ? Transaction.userEvent.of(userEvent) : [],
        };
    }),
];

const titleTheme = EditorView.baseTheme({
    '.cm-foldGutter .cm-gutterElement.cm-gutter-title': { cursor: 'auto' },
    '.cm-foldGutter .cm-gutter-title > span': { visibility: 'hidden' },
    // Matches prosemark's H1 text so the empty title line is already title-sized.
    '.cm-title-placeholder': {
        fontSize: '1.6em',
        fontWeight: 'bold',
        opacity: '0.4',
        pointerEvents: 'none',
    },
});

/**
 * Obsidian-style title for the live editor: the note's first line is an H1 whose
 * `# ` mark is always hidden, unlike other headings that reveal it under the cursor.
 */
export const titleLineExtension = [
    titleDecorations,
    titleInput,
    Prec.high(titleKeymap),
    titleNoFold,
    titleTheme,
];
