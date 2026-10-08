import { getSyncedVersion, sendableUpdates } from '@codemirror/collab';
import {
    type EditorState,
    type Extension,
    RangeSetBuilder,
    StateEffect,
    StateField,
    Transaction,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    type ViewUpdate,
    WidgetType,
} from '@codemirror/view';
import type { LiveNoteSession, RemotePresence } from './live-connection';

/** An editor in the note besides this one, for showing who's there. */
export type LivePeer = { peer: string; username: string; color: string };

type Cursor = LivePeer & { anchor: number; head: number };

const SEND_INTERVAL = 100;
const HEARTBEAT = 30_000;
const EXPIRE_AFTER = 75_000;

const COLORS = [
    '#e5484d',
    '#3e63dd',
    '#30a46c',
    '#f76b15',
    '#8e4ec6',
    '#12a594',
    '#d6409f',
    '#ad7f58',
];

function colorFor(userId: string): string {
    let hash = 0;
    for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return COLORS[Math.abs(hash) % COLORS.length]!;
}

const setCursor = StateEffect.define<Cursor>();
const removeCursor = StateEffect.define<string>();

const cursorsField = StateField.define<Map<string, Cursor>>({
    create: () => new Map(),
    update(cursors, tr) {
        let next = cursors;
        if (tr.docChanged) {
            next = new Map();
            for (const [peer, c] of cursors) {
                next.set(peer, {
                    ...c,
                    anchor: tr.changes.mapPos(c.anchor),
                    head: tr.changes.mapPos(c.head),
                });
            }
        }
        for (const effect of tr.effects) {
            if (effect.is(setCursor)) {
                if (next === cursors) next = new Map(cursors);
                next.set(effect.value.peer, effect.value);
            } else if (effect.is(removeCursor) && next.has(effect.value)) {
                if (next === cursors) next = new Map(cursors);
                next.delete(effect.value);
            }
        }
        return next;
    },
    provide: (field) =>
        EditorView.decorations.from(field, (cursors) => buildDecorations(cursors)),
});

class CursorWidget extends WidgetType {
    constructor(
        private name: string,
        private color: string,
    ) {
        super();
    }

    eq(other: CursorWidget) {
        return other.name === this.name && other.color === this.color;
    }

    toDOM() {
        const caret = document.createElement('span');
        caret.className = 'cm-remote-caret';
        caret.style.borderColor = this.color;
        caret.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'cm-remote-caret-label';
        label.style.backgroundColor = this.color;
        label.textContent = this.name;
        caret.appendChild(label);
        return caret;
    }

    ignoreEvent() {
        return true;
    }
}

function buildDecorations(cursors: Map<string, Cursor>): DecorationSet {
    const ranges: { from: number; to: number; deco: Decoration }[] = [];
    for (const c of cursors.values()) {
        const from = Math.min(c.anchor, c.head);
        const to = Math.max(c.anchor, c.head);
        if (from < to) {
            ranges.push({
                from,
                to,
                deco: Decoration.mark({
                    attributes: { style: `background-color: ${c.color}55` },
                }),
            });
        }
        ranges.push({
            from: c.head,
            to: c.head,
            deco: Decoration.widget({
                widget: new CursorWidget(c.username, c.color),
                side: 1,
            }),
        });
    }
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const r of ranges) builder.add(r.from, r.to, r.deco);
    return builder.finish();
}

const cursorTheme = EditorView.baseTheme({
    '.cm-remote-caret': {
        position: 'relative',
        borderLeft: '2px solid',
        marginLeft: '-1px',
        marginRight: '-1px',
        pointerEvents: 'none',
    },
    '.cm-remote-caret-label': {
        position: 'absolute',
        bottom: '100%',
        left: '-2px',
        padding: '0 4px',
        borderRadius: '3px 3px 3px 0',
        color: '#fff',
        fontSize: '11px',
        lineHeight: '16px',
        fontFamily: 'sans-serif',
        whiteSpace: 'nowrap',
        zIndex: '10',
    },
});

/** Positions in this editor's document -> the server document at the synced version. */
function toSynced(state: EditorState, pos: number): number {
    const unconfirmed = sendableUpdates(state);
    for (let i = unconfirmed.length - 1; i >= 0; i--) {
        pos = unconfirmed[i]!.changes.invertedDesc.mapPos(pos);
    }
    return pos;
}

/**
 * A position in the server document at `version` -> this editor's document, or null
 * if this editor no longer knows the changes since then.
 */
function fromServer(
    session: LiveNoteSession,
    state: EditorState,
    version: number,
    pos: number,
): number | null {
    const sinceVersion = session.changesBetween(version, getSyncedVersion(state));
    if (!sinceVersion) return null;
    for (const change of [
        ...sinceVersion,
        ...sendableUpdates(state).map((u) => u.changes),
    ]) {
        // Positions come from another client; keep them inside the document.
        pos = change.mapPos(Math.min(pos, change.length));
    }
    return Math.min(pos, state.doc.length);
}

/**
 * Shows other editors' cursors and selections in the note and shares this one's, over
 * a live session. `onPeersChange` receives the other editors currently in the note.
 */
export function remoteCursorExtensions(
    session: LiveNoteSession,
    onPeersChange: (peers: LivePeer[]) => void,
): Extension[] {
    const plugin = ViewPlugin.fromClass(
        class {
            // Presence for versions this editor hasn't received yet.
            private pending = new Map<
                string,
                Extract<RemotePresence, { gone?: false }>
            >();
            private lastSeen = new Map<string, number>();
            private sendTimer: ReturnType<typeof setTimeout> | null = null;
            private heartbeat: ReturnType<typeof setInterval>;
            private unsubscribe: Array<() => void>;
            private peersKey = '';
            private done = false;

            constructor(private view: EditorView) {
                this.unsubscribe = [
                    session.onPresence((p) => this.receive(p)),
                    session.onPresenceRequest(() => this.sendNow()),
                ];
                this.heartbeat = setInterval(() => {
                    this.sendNow();
                    this.expire();
                }, HEARTBEAT);
                this.sendNow();
                // A rebuilt editor keeps the cursors field; report its peers again.
                this.reportPeers();
            }

            update(update: ViewUpdate) {
                const versionChanged =
                    getSyncedVersion(update.startState) !==
                    getSyncedVersion(update.state);
                if (
                    update.selectionSet ||
                    update.transactions.some(
                        (tr) => tr.docChanged && !tr.annotation(Transaction.remote),
                    ) ||
                    // Own edits just confirmed: the last position sent was from before them.
                    (versionChanged && sendableUpdates(update.startState).length > 0)
                ) {
                    this.scheduleSend();
                }
                if (this.pending.size && versionChanged) {
                    // Apply after this update finishes; dispatching inside update() isn't allowed.
                    queueMicrotask(() => this.applyPending());
                }
                if (
                    update.startState.field(cursorsField) !==
                    update.state.field(cursorsField)
                ) {
                    this.reportPeers();
                }
            }

            private scheduleSend() {
                if (this.sendTimer) return;
                this.sendTimer = setTimeout(() => {
                    this.sendTimer = null;
                    this.sendNow();
                }, SEND_INTERVAL);
            }

            private sendNow() {
                const state = this.view.state;
                const { anchor, head } = state.selection.main;
                session.sendPresence({
                    version: getSyncedVersion(state),
                    anchor: toSynced(state, anchor),
                    head: toSynced(state, head),
                });
            }

            private receive(p: RemotePresence) {
                if (p.gone) {
                    this.pending.delete(p.peer);
                    this.lastSeen.delete(p.peer);
                    this.view.dispatch({ effects: removeCursor.of(p.peer) });
                    return;
                }
                this.lastSeen.set(p.peer, Date.now());
                if (p.version > getSyncedVersion(this.view.state)) {
                    this.pending.set(p.peer, p);
                } else {
                    this.pending.delete(p.peer);
                    this.apply(p);
                }
            }

            private applyPending() {
                if (this.done) return;
                const version = getSyncedVersion(this.view.state);
                for (const [peer, p] of this.pending) {
                    if (p.version <= version) {
                        this.pending.delete(peer);
                        this.apply(p);
                    }
                }
            }

            private apply(p: Extract<RemotePresence, { gone?: false }>) {
                const state = this.view.state;
                // If the changes since are no longer known, show it approximately; the
                // peer's next update corrects it.
                const map = (pos: number) =>
                    fromServer(session, state, p.version, pos) ??
                    Math.min(pos, state.doc.length);
                this.view.dispatch({
                    effects: setCursor.of({
                        peer: p.peer,
                        username: p.user.username,
                        color: colorFor(p.user.id),
                        anchor: map(p.anchor),
                        head: map(p.head),
                    }),
                });
            }

            private expire() {
                const cutoff = Date.now() - EXPIRE_AFTER;
                const stale = [...this.lastSeen].filter(([, seen]) => seen < cutoff);
                if (!stale.length) return;
                for (const [peer] of stale) {
                    this.lastSeen.delete(peer);
                    this.pending.delete(peer);
                }
                this.view.dispatch({
                    effects: stale.map(([peer]) => removeCursor.of(peer)),
                });
            }

            private reportPeers() {
                const peers = [...this.view.state.field(cursorsField).values()].map(
                    ({ peer, username, color }) => ({ peer, username, color }),
                );
                const key = peers.map((p) => `${p.peer}:${p.username}`).join('|');
                if (key === this.peersKey) return;
                this.peersKey = key;
                onPeersChange(peers);
            }

            destroy() {
                this.done = true;
                for (const stop of this.unsubscribe) stop();
                clearInterval(this.heartbeat);
                if (this.sendTimer) clearTimeout(this.sendTimer);
                onPeersChange([]);
            }
        },
    );
    return [cursorsField, cursorTheme, plugin];
}
