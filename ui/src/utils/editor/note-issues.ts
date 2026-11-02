import { StateEffect, StateField, Text } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import type { components } from '@services/openapi/schema';

type NoteStatusIssue = components['schemas']['NoteStatusIssue'];

/** One place a note status issue points at; `from`/`line` are null when the link wasn't found in the text. */
export type NoteIssueRow = {
    issue: NoteStatusIssue;
    text: string;
    from: number | null;
    to: number | null;
    line: number | null;
};

// Mirrors the backend's cradle link pattern (notes/markdown/constants.py LINK_REGEX).
const LINK =
    /\[\[([^:|\]]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|(?:\\[[\]|]|[^[\]|])+?)?\]\]/g;

const NO_ROWS: NoteIssueRow[] = [];

/** Every link in `content` a status issue points at, in document order, then any issue not found. */
export function locateNoteIssues(
    content: string,
    issues: NoteStatusIssue[],
): NoteIssueRow[] {
    if (issues.length === 0) return NO_ROWS;
    const doc = Text.of(content.split('\n'));
    const rows: NoteIssueRow[] = [];
    const found = new Set<NoteStatusIssue>();
    for (const m of content.matchAll(LINK)) {
        const key = (m[1] ?? '').trim();
        const value = (m[2] ?? '').trim();
        const issue = issues.find(
            (i) => i.key === key && (i.value === null || i.value === value),
        );
        if (!issue) continue;
        found.add(issue);
        rows.push({
            issue,
            text: m[0],
            from: m.index,
            to: m.index + m[0].length,
            line: doc.lineAt(m.index).number,
        });
    }
    for (const issue of issues) {
        if (found.has(issue)) continue;
        rows.push({
            issue,
            text: `[[${issue.key}:${issue.value ?? '…'}]]`,
            from: null,
            to: null,
            line: null,
        });
    }
    return rows;
}

const setNoteIssueRanges = StateEffect.define<{ from: number; to: number }[]>();
const issueMark = Decoration.mark({ class: 'cm-note-issue' });

const noteIssueField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(setNoteIssueRanges)) {
                decorations = Decoration.set(
                    effect.value.map((r) => issueMark.range(r.from, r.to)),
                    true,
                );
            }
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
});

/** Underlines the links behind an invalid note status; set them with `highlightNoteIssues`. */
export const noteIssueHighlight = [
    noteIssueField,
    EditorView.baseTheme({
        '.cm-note-issue': {
            textDecoration: 'underline wavy var(--destructive)',
            textDecorationSkipInk: 'none',
            textUnderlineOffset: '3px',
        },
    }),
];

export function highlightNoteIssues(view: EditorView, rows: NoteIssueRow[]): void {
    // Rows come from the latest synced text; skip any the view has already moved past.
    const length = view.state.doc.length;
    const ranges = rows.flatMap((r) =>
        r.from === null || r.to === null || r.to > length
            ? []
            : [{ from: r.from, to: r.to }],
    );
    view.dispatch({ effects: setNoteIssueRanges.of(ranges) });
}
