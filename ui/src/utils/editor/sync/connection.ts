import type { Update } from '@codemirror/collab';
import { ChangeSet } from '@codemirror/state';

/** Thrown when {@link EditorSyncConnection.close} runs while a request is in flight. */
export const EDITOR_SYNC_CONNECTION_CLOSED = 'Editor sync connection closed';

const workerUrl = new URL('./authority.shared-worker.ts', import.meta.url);

export type EditorSyncConnection = {
    getDocument(): Promise<{ version: number; doc: string }>;
    pushUpdates(version: number, updates: readonly Update[]): Promise<boolean>;
    pullUpdates(version: number): Promise<readonly Update[]>;
    close(): void;
};

/**
 * Syncs the note editor document across browser tabs via a SharedWorker, using
 * {@link https://codemirror.net/examples/collab/ | CodeMirror’s collab OT} on the wire.
 */
export function createNoteEditorSyncConnection(
    noteId: string,
    bootstrapDoc: string,
): EditorSyncConnection | null {
    if (typeof SharedWorker === 'undefined') return null;

    const sessionKey = `cradle-note-editor-sync:${noteId}`;
    let worker: SharedWorker;
    try {
        worker = new SharedWorker(workerUrl, {
            type: 'module',
            name: 'cradle-note-editor-sync',
        });
    } catch {
        return null;
    }

    const port = worker.port;
    port.start();

    let closed = false;
    let nextId = 0;
    const pending = new Map<
        number,
        { resolve: (v: unknown) => void; reject: (e: unknown) => void }
    >();

    port.onmessage = (event: MessageEvent) => {
        const raw = event.data;
        if (raw == null || typeof raw !== 'object') return;
        const data = raw as {
            id: number;
            ok?: boolean;
            error?: string;
            payload?: unknown;
        };
        if (typeof data.id !== 'number') return;
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        if (data.error) entry.reject(new Error(data.error));
        else entry.resolve(data.payload);
    };

    function request(payload: Record<string, unknown>): Promise<unknown> {
        if (closed) return Promise.reject(new Error(EDITOR_SYNC_CONNECTION_CLOSED));
        const id = nextId++;
        return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            try {
                port.postMessage({ id, sessionKey, ...payload });
            } catch {
                pending.delete(id);
                reject(new Error(EDITOR_SYNC_CONNECTION_CLOSED));
            }
        });
    }

    let joined = false;
    async function ensureJoin() {
        if (joined) return;
        await request({ type: 'join', bootstrapDoc: bootstrapDoc });
        joined = true;
    }

    return {
        async getDocument() {
            await ensureJoin();
            const data = (await request({ type: 'getDocument' })) as {
                version: number;
                doc: string;
            };
            return data;
        },
        async pushUpdates(version: number, updates: readonly Update[]) {
            await ensureJoin();
            const stripped = updates.map((u) => ({
                clientID: u.clientID,
                changes: u.changes.toJSON(),
            }));
            return (await request({ type: 'pushUpdates', version, updates: stripped })) as boolean;
        },
        async pullUpdates(version: number) {
            await ensureJoin();
            const raw = (await request({ type: 'pullUpdates', version })) as unknown;
            const list = Array.isArray(raw)
                ? (raw as { clientID: string; changes: unknown }[])
                : [];
            return list.map((u) => ({
                changes: ChangeSet.fromJSON(u.changes),
                clientID: u.clientID,
            }));
        },
        close() {
            if (closed) return;
            closed = true;
            for (const [, entry] of pending) {
                entry.reject(new Error(EDITOR_SYNC_CONNECTION_CLOSED));
            }
            pending.clear();
            port.close();
        },
    };
}
