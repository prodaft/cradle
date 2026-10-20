import {
    StateEffect,
    StateField,
    type EditorState,
    type Text,
    type Transaction,
} from '@codemirror/state';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { revealSuspended } from '@prosemark/core';

/**
 * The selection that unfolds rendered syntax back to raw markdown. Read-only views
 * never unfold (positions of -1 touch nothing), so reading mode stays rendered while
 * text can still be selected and copied. Nor does a pointer selection that is still
 * being dragged (see revealAfterPointerSelection).
 */
export function revealSelection(state: EditorState): {
    head: number;
    from: number;
    to: number;
} {
    if (state.readOnly || state.facet(revealSuspended)) {
        return { head: -1, from: -1, to: -1 };
    }
    const { head, from, to } = state.selection.main;
    return { head, from, to };
}

/**
 * Whether revealSelection may give a different answer for the same selection, so
 * decorations built from it need rebuilding.
 */
export function revealStateChanged(update: {
    startState: EditorState;
    state: EditorState;
}): boolean {
    const { startState, state } = update;
    return (
        startState.readOnly !== state.readOnly ||
        startState.facet(revealSuspended) !== state.facet(revealSuspended)
    );
}

const endPointerSelection = StateEffect.define<null>();

const pointerSelecting = StateField.define<boolean>({
    create: () => false,
    update(selecting, tr: Transaction) {
        if (tr.effects.some((e) => e.is(endPointerSelection))) return false;
        // Reading mode never reveals, so there is nothing to hold back.
        return selecting || (!tr.state.readOnly && tr.isUserEvent('select.pointer'));
    },
    provide: (field) => revealSuspended.from(field),
});

/**
 * Keeps syntax rendered while a mouse selection is being made and reveals it once
 * the button is released, so text doesn't shift under the pointer mid-drag.
 * CodeMirror tags its mouse selection transactions `select.pointer`; the release is
 * caught on window, after CodeMirror's own document-level mouseup.
 */
export const revealAfterPointerSelection = [
    pointerSelecting,
    ViewPlugin.define((view: EditorView) => {
        const end = () => {
            if (view.state.field(pointerSelecting)) {
                view.dispatch({ effects: endPointerSelection.of(null) });
            }
        };
        // A release outside the window can go unreported; CodeMirror ends its own
        // selection on the next move without buttons, so do the same.
        const move = (event: MouseEvent) => {
            if (event.buttons === 0) end();
        };
        const win = view.dom.ownerDocument.defaultView ?? window;
        win.addEventListener('mouseup', end);
        win.addEventListener('dragend', end);
        win.addEventListener('blur', end);
        win.addEventListener('mousemove', move);
        return {
            destroy() {
                win.removeEventListener('mouseup', end);
                win.removeEventListener('dragend', end);
                win.removeEventListener('blur', end);
                win.removeEventListener('mousemove', move);
            },
        };
    }),
];

/**
 * ViewPlugin `Decoration.replace` ranges must not include a line break; CM6 throws
 * "Decorations that replace line breaks may not be specified via plugins" otherwise.
 * StateField-based decorations (e.g. markdown tables) may still span lines.
 */
export function pluginReplaceSpansLineBreak(
    doc: Text,
    from: number,
    to: number,
): boolean {
    return from < to && doc.sliceString(from, to).includes('\n');
}
