import { apiWebSocketUrl } from '@/utils/websocket';
import type { Update } from '@codemirror/collab';
import { ChangeSet } from '@codemirror/state';
import { ensureClientSession } from '@services/openapi/client';
import { EDITOR_SYNC_CONNECTION_CLOSED, type EditorSyncConnection } from './connection';
import { ReconnectTimer } from './reconnect-timer';

type LiveSaveState = 'saved' | 'saving' | 'error' | 'conflict';

export type LiveStatus = {
    saveState: LiveSaveState;
    /** Why the last save failed (error or conflict). */
    message: string;
    /** Edits exist that the server has not saved to the note yet. */
    dirty: boolean;
    /** The server stopped accepting this user's edits (access was revoked). */
    accessLost: boolean;
    /** Local edits the server hasn't accepted yet (e.g. typed while disconnected). */
    unsent: boolean;
    /** When (Date.now()) the oldest of those edits was made; null when there are none. */
    unsentSince: number | null;
    /** The socket is open and authenticated. */
    connected: boolean;
    /** When (Date.now()) the next reconnect attempt starts; null while connected or attempting. */
    reconnectAt: number | null;
};

/** Another editor's cursor; positions are in the document at server `version`. */
export type RemotePresence =
    | {
          peer: string;
          gone?: false;
          user: { id: string; username: string };
          version: number;
          anchor: number;
          head: number;
      }
    | { peer: string; gone: true };

/** Server-side save state of a live note session, and the actions on it. */
export type LiveNoteSession = {
    getStatus(): LiveStatus;
    subscribe(listener: (status: LiveStatus) => void): () => void;
    /** The session can't continue (e.g. the server lost its history); reconnect from scratch. */
    onReset(listener: () => void): () => void;
    saveNow(): void;
    /** Starts a pending reconnect attempt now (or a second after the last one). */
    reconnectNow(): void;
    resolveConflict(choice: 'mine' | 'theirs'): void;
    /** Shares this editor's selection, in the document at server `version`. */
    sendPresence(presence: { version: number; anchor: number; head: number }): void;
    onPresence(listener: (presence: RemotePresence) => void): () => void;
    /** Someone joined (or this editor reconnected): share the selection again. */
    onPresenceRequest(listener: () => void): () => void;
    /** Server changes from version `from` to `to`, or null if no longer known. */
    changesBetween(from: number, to: number): readonly ChangeSet[] | null;
};

export type LiveEditorSyncConnection = EditorSyncConnection & { live: LiveNoteSession };

type UpdateJSON = { clientID: string; changes: unknown };

const CLOSE_FORBIDDEN = 4403;
const HISTORY_SIZE = 200;
const REQUEST_TIMEOUT = 15_000;

/**
 * Live editing of a note with other users, through the server's WebSocket authority
 * ({@link https://codemirror.net/examples/collab/ | CodeMirror collab} on the wire).
 * Resolves to null when the server can't be reached.
 */
export async function connectLiveNote(
    noteId: string,
    timeoutMs = 4000,
): Promise<LiveEditorSyncConnection | null> {
    if (typeof WebSocket === 'undefined') return null;
    const connection = new LiveConnection(noteId);
    if (await connection.connect(timeoutMs)) return connection.api;
    connection.close();
    return null;
}

class LiveConnection {
    private socket: WebSocket | null = null;
    private closed = false;
    private readonly retry = new ReconnectTimer(
        () => void this.reconnect(),
        () => this.emitStatus(),
    );
    private nextId = 0;
    private pending = new Map<
        number,
        { resolve: (v: unknown) => void; reject: (e: unknown) => void }
    >();

    private synced = false;
    private buffer: Update[] = [];
    private bufferStart = 0;
    private waiters: Array<() => void> = [];
    private history: ChangeSet[] = [];
    private historyStart = 0;

    private serverVersion = 0;
    private savedVersion = 0;
    private saveState: LiveSaveState = 'saved';
    private saveMessage = '';
    private unsent = false;
    private unsentSince: number | null = null;
    private connected = false;
    private sessionId = '';
    private accessLost = false;
    private statusListeners = new Set<(status: LiveStatus) => void>();
    private resetListeners = new Set<() => void>();
    private peerId = '';
    private presenceListeners = new Set<(presence: RemotePresence) => void>();
    private presenceRequestListeners = new Set<() => void>();

    readonly api: LiveEditorSyncConnection;

    private readonly onOffline = () => {
        if (this.socket && this.connected) this.dropSocket(this.socket);
    };

    constructor(private noteId: string) {
        window.addEventListener('offline', this.onOffline);
        this.api = {
            getDocument: () => this.getDocument(),
            pushUpdates: (version, updates) => this.pushUpdates(version, updates),
            pullUpdates: (version) => this.pullUpdates(version),
            close: () => this.close(),
            setPendingLocal: (pending) => {
                if (pending === this.unsent) return;
                this.unsent = pending;
                this.unsentSince = pending ? Date.now() : null;
                this.emitStatus();
            },
            live: {
                getStatus: () => this.status(),
                subscribe: (listener) => {
                    this.statusListeners.add(listener);
                    return () => this.statusListeners.delete(listener);
                },
                onReset: (listener) => {
                    this.resetListeners.add(listener);
                    return () => this.resetListeners.delete(listener);
                },
                saveNow: () => void this.request({ type: 'saveNow' }).catch(() => {}),
                reconnectNow: () => this.retry.retrySoon(),
                resolveConflict: (choice) =>
                    void this.request({ type: 'resolveConflict', choice }).catch(
                        () => {},
                    ),
                sendPresence: (presence) => {
                    if (this.socket?.readyState === WebSocket.OPEN) {
                        this.socket.send(
                            JSON.stringify({ type: 'presence', ...presence }),
                        );
                    }
                },
                onPresence: (listener) => {
                    this.presenceListeners.add(listener);
                    return () => this.presenceListeners.delete(listener);
                },
                onPresenceRequest: (listener) => {
                    this.presenceRequestListeners.add(listener);
                    return () => this.presenceRequestListeners.delete(listener);
                },
                changesBetween: (from, to) => {
                    const end = this.historyStart + this.history.length;
                    if (from < this.historyStart || to > end || from > to) return null;
                    return this.history.slice(
                        from - this.historyStart,
                        to - this.historyStart,
                    );
                },
            },
        };
    }

    async connect(timeoutMs: number): Promise<boolean> {
        if (!(await ensureClientSession())) return false;
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok: boolean) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            };
            const timer = setTimeout(() => {
                socket.onmessage = socket.onclose = null;
                socket.close();
                if (this.socket === socket) this.socket = null;
                finish(false);
            }, timeoutMs);

            let socket: WebSocket;
            try {
                socket = new WebSocket(apiWebSocketUrl(`/ws/notes/${this.noteId}/`));
            } catch {
                finish(false);
                return;
            }
            this.socket = socket;

            socket.onopen = () => {
                socket.send(JSON.stringify({ type: 'auth' }));
            };
            socket.onmessage = (event) => {
                let data: Record<string, unknown>;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (data.type === 'ready') {
                    this.retry.resetBackoff();
                    this.peerId = String(data.peerId ?? '');
                    this.connected = true;
                    this.emitStatus();
                    finish(true);
                    for (const listener of this.presenceRequestListeners) listener();
                }
                this.handleMessage(data);
            };
            socket.onclose = (event) => {
                if (this.socket === socket) this.socket = null;
                this.markDisconnected();
                if (!settled) {
                    finish(false);
                } else if (event.code === CLOSE_FORBIDDEN) {
                    this.loseAccess();
                } else if (!this.closed) {
                    this.retry.schedule();
                }
            };
        });
    }

    private dropSocket(socket: WebSocket) {
        if (this.socket !== socket) return;
        socket.onmessage = socket.onclose = null;
        socket.close();
        this.socket = null;
        this.markDisconnected();
        if (!this.closed) this.retry.schedule();
    }

    private markDisconnected() {
        if (this.connected) {
            this.connected = false;
            this.emitStatus();
        }
        this.failPending();
    }

    private async reconnect() {
        if (this.closed) return;
        if (await this.connect(5000)) {
            if (this.closed) return;
            void this.catchUp();
        } else if (!this.closed && !this.socket) {
            this.retry.schedule();
        }
    }

    private handleMessage(data: Record<string, unknown>) {
        if (typeof data.id === 'number') {
            const entry = this.pending.get(data.id);
            if (!entry) return;
            this.pending.delete(data.id);
            if (data.error != null) {
                entry.reject(
                    Object.assign(new Error(String(data.error)), { code: data.code }),
                );
            } else entry.resolve(data.payload);
            return;
        }
        if (data.type === 'updates') {
            this.receiveUpdates(data.version as number, data.updates as UpdateJSON[]);
        } else if (data.type === 'presence') {
            if (data.peer === this.peerId) return;
            for (const listener of this.presenceListeners) {
                listener(data as unknown as RemotePresence);
            }
        } else if (data.type === 'peerJoined') {
            if (data.peer === this.peerId) return;
            for (const listener of this.presenceRequestListeners) listener();
        } else if (data.type === 'saveState') {
            const state = data.state as LiveSaveState;
            this.saveState = state;
            this.saveMessage = typeof data.message === 'string' ? data.message : '';
            if (state === 'saved') {
                this.savedVersion = Math.max(this.savedVersion, data.version as number);
            }
            this.emitStatus();
        }
    }

    private request(payload: Record<string, unknown>): Promise<unknown> {
        const socket = this.socket;
        if (this.closed || !socket || socket.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error(EDITOR_SYNC_CONNECTION_CLOSED));
        }
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => this.dropSocket(socket), REQUEST_TIMEOUT);
            this.pending.set(id, {
                resolve: (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
            });
            socket.send(JSON.stringify({ id, ...payload }));
        });
    }

    private failPending() {
        for (const [, entry] of this.pending) {
            entry.reject(new Error(EDITOR_SYNC_CONNECTION_CLOSED));
        }
        this.pending.clear();
    }

    private async getDocument() {
        const data = (await this.request({ type: 'getDocument' })) as {
            sessionId?: string;
            version: number;
            doc: string;
            savedVersion: number;
            saveState: LiveSaveState;
            saveMessage: string;
        };
        this.synced = true;
        this.sessionId = data.sessionId ?? '';
        this.buffer = [];
        this.bufferStart = data.version;
        this.history = [];
        this.historyStart = data.version;
        this.serverVersion = data.version;
        this.savedVersion = data.savedVersion;
        this.saveState = data.saveState;
        this.saveMessage = data.saveMessage;
        this.emitStatus();
        return { version: data.version, doc: data.doc };
    }

    private async pushUpdates(version: number, updates: readonly Update[]) {
        if (this.accessLost) throw new Error(EDITOR_SYNC_CONNECTION_CLOSED);
        if (!this.socket) return false;
        try {
            const accepted = await this.request({
                type: 'pushUpdates',
                sessionId: this.sessionId,
                version,
                updates: updates.map((u) => ({
                    clientID: u.clientID,
                    changes: u.changes.toJSON(),
                })),
            });
            if (accepted === true) return true;
            void this.catchUp();
            return false;
        } catch (error) {
            const code = (error as { code?: unknown }).code;
            if (code === 'forbidden') this.loseAccess();
            if (code === 'resync') this.resync();
            if (code === 'forbidden' || code === 'resync') {
                throw new Error(EDITOR_SYNC_CONNECTION_CLOSED, { cause: error });
            }
            return false;
        }
    }

    private async pullUpdates(version: number): Promise<readonly Update[]> {
        for (;;) {
            if (this.closed) throw new Error(EDITOR_SYNC_CONNECTION_CLOSED);
            if (version > this.bufferStart) {
                const drop = Math.min(version - this.bufferStart, this.buffer.length);
                this.buffer.splice(0, drop);
                this.bufferStart += drop;
            }
            if (this.bufferStart + this.buffer.length > version) {
                return this.buffer.slice(version - this.bufferStart);
            }
            await new Promise<void>((resolve) => this.waiters.push(resolve));
        }
    }

    private receiveUpdates(start: number, updates: UpdateJSON[]) {
        if (!this.synced) return;
        const end = this.bufferStart + this.buffer.length;
        if (start > end) {
            void this.catchUp();
            return;
        }
        const fresh = updates.slice(end - start).map((u) => ({
            clientID: u.clientID,
            changes: ChangeSet.fromJSON(u.changes),
        }));
        if (!fresh.length) return;
        this.buffer.push(...fresh);
        this.history.push(...fresh.map((u) => u.changes));
        if (this.history.length > HISTORY_SIZE) {
            const drop = this.history.length - HISTORY_SIZE;
            this.history.splice(0, drop);
            this.historyStart += drop;
        }
        this.serverVersion = Math.max(this.serverVersion, start + updates.length);
        this.wakeWaiters();
        this.emitStatus();
    }

    private async catchUp() {
        try {
            const data = (await this.request({
                type: 'pullUpdates',
                sessionId: this.sessionId,
                version: this.bufferStart + this.buffer.length,
            })) as {
                version: number;
                updates: UpdateJSON[];
                savedVersion: number;
                saveState: LiveSaveState;
                saveMessage: string;
            };
            this.receiveUpdates(data.version, data.updates);
            this.savedVersion = Math.max(this.savedVersion, data.savedVersion);
            this.saveState = data.saveState;
            this.saveMessage = data.saveMessage;
            this.emitStatus();
        } catch (error) {
            if ((error as { code?: unknown }).code === 'resync') this.resync();
        }
    }

    private wakeWaiters() {
        const waiters = this.waiters;
        this.waiters = [];
        for (const wake of waiters) wake();
    }

    private resync() {
        for (const listener of this.resetListeners) listener();
    }

    private loseAccess() {
        if (this.accessLost) return;
        this.accessLost = true;
        this.saveState = 'error';
        this.saveMessage = 'You can no longer edit this note.';
        this.emitStatus();
    }

    private status(): LiveStatus {
        return {
            accessLost: this.accessLost,
            saveState: this.saveState,
            message: this.saveMessage,
            dirty: this.serverVersion > this.savedVersion || this.unsent,
            unsent: this.unsent,
            unsentSince: this.unsentSince,
            connected: this.connected,
            reconnectAt: this.retry.at,
        };
    }

    private emitStatus() {
        const status = this.status();
        for (const listener of this.statusListeners) listener(status);
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        this.retry.cancel();
        window.removeEventListener('offline', this.onOffline);
        this.failPending();
        this.wakeWaiters();
        this.socket?.close(1000);
        this.socket = null;
    }
}
