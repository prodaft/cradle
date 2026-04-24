import {
    collab,
    getSyncedVersion,
    receiveUpdates,
    sendableUpdates,
} from '@codemirror/collab';
import type { Extension } from '@codemirror/state';
import { ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view';
import {
    EDITOR_SYNC_CONNECTION_CLOSED,
    type EditorSyncConnection,
} from './connection';

/**
 * CodeMirror extensions that sync the editor document across tabs (via {@link EditorSyncConnection}),
 * using `@codemirror/collab` as in
 * {@link https://codemirror.net/examples/collab/ | CodeMirror’s collab example}.
 */
export function codemirrorEditorSyncPeerExtensions(
    startVersion: number,
    connection: EditorSyncConnection,
): Extension[] {
    const plugin = ViewPlugin.fromClass(
        class {
            private pushing = false;
            private done = false;

            constructor(private view: EditorView) {
                void this.pull();
            }

            update(update: ViewUpdate) {
                if (update.docChanged) void this.push();
            }

            async push() {
                const updates = sendableUpdates(this.view.state);
                if (this.pushing || !updates.length || this.done) return;
                this.pushing = true;
                const version = getSyncedVersion(this.view.state);
                try {
                    await connection.pushUpdates(version, updates);
                } catch (e) {
                    if (this.done) return;
                    if (e instanceof Error && e.message === EDITOR_SYNC_CONNECTION_CLOSED) return;
                    if (sendableUpdates(this.view.state).length) {
                        setTimeout(() => void this.push(), 150);
                    }
                    return;
                } finally {
                    this.pushing = false;
                }
                if (this.done) return;
                if (sendableUpdates(this.view.state).length) {
                    setTimeout(() => void this.push(), 100);
                }
            }

            async pull() {
                while (!this.done) {
                    try {
                        const version = getSyncedVersion(this.view.state);
                        const updates = await connection.pullUpdates(version);
                        if (this.done) return;
                        this.view.dispatch(receiveUpdates(this.view.state, updates));
                    } catch (e) {
                        if (this.done) return;
                        if (e instanceof Error && e.message === EDITOR_SYNC_CONNECTION_CLOSED) return;
                        await new Promise((r) => setTimeout(r, 200));
                    }
                }
            }

            destroy() {
                this.done = true;
            }
        },
    );
    return [collab({ startVersion }), plugin];
}
