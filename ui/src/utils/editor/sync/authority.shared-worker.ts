/// <reference lib="webworker" />
import { type Update, rebaseUpdates } from '@codemirror/collab';
import { ChangeSet, Text } from '@codemirror/state';

declare const self: SharedWorkerGlobalScope;

type Session = {
    updates: Update[];
    doc: Text;
    pending: Array<(value: unknown) => void>;
};

const sessions = new Map<string, Session>();

function getSession(key: string): Session {
    let s = sessions.get(key);
    if (!s) {
        s = { updates: [], doc: Text.empty, pending: [] };
        sessions.set(key, s);
    }
    return s;
}

function docFromString(s: string): Text {
    if (s.length === 0) return Text.empty;
    return Text.of(s.split('\n'));
}

function maybeBootstrap(session: Session, bootstrapDoc: string | undefined) {
    if (session.updates.length > 0) return;
    if (session.doc.length > 0) return;
    if (bootstrapDoc === undefined) return;
    session.doc = docFromString(bootstrapDoc);
}

self.onconnect = (event: Event) => {
    const port = (event as MessageEvent).ports[0];
    port.start();

    port.onmessage = (ev: MessageEvent) => {
        const raw = ev.data;
        if (raw == null || typeof raw !== 'object') return;
        const data = raw as {
            id: number;
            sessionKey: string;
            type: string;
            bootstrapDoc?: string;
            version?: number;
            updates?: { clientID: string; changes: unknown }[];
        };
        if (typeof data.id !== 'number') return;

        function respond(payload: unknown, error?: string) {
            try {
                port.postMessage(
                    error != null
                        ? { id: data.id, error }
                        : { id: data.id, ok: true, payload },
                );
            } catch {
                /* Port closed; client disconnected. */
            }
        }

        const sessionKey = data.sessionKey;
        if (typeof sessionKey !== 'string' || sessionKey.length === 0) {
            respond(null, 'missing sessionKey');
            return;
        }

        const session = getSession(sessionKey);

        if (data.type === 'join') {
            maybeBootstrap(session, data.bootstrapDoc);
            respond(true);
            return;
        }

        if (data.type === 'pullUpdates') {
            const version = data.version ?? 0;
            if (version < session.updates.length) {
                respond(
                    session.updates.slice(version).map((u) => ({
                        clientID: u.clientID,
                        changes: u.changes.toJSON(),
                        ...(u.effects?.length ? { effects: u.effects } : {}),
                    })),
                );
            } else {
                session.pending.push((value) => respond(value));
            }
            return;
        }

        if (data.type === 'pushUpdates') {
            const version = data.version ?? 0;
            let received: Update[] = (data.updates ?? []).map((json) => ({
                clientID: json.clientID,
                changes: ChangeSet.fromJSON(json.changes),
            }));
            if (version !== session.updates.length) {
                received = [...rebaseUpdates(received, session.updates.slice(version))];
            }
            for (const update of received) {
                session.updates.push(update);
                session.doc = update.changes.apply(session.doc);
            }
            respond(true);
            if (received.length) {
                const json = received.map((update) => ({
                    clientID: update.clientID,
                    changes: update.changes.toJSON(),
                    ...(update.effects?.length ? { effects: update.effects } : {}),
                }));
                while (session.pending.length) {
                    const fn = session.pending.pop();
                    fn?.(json);
                }
            }
            return;
        }

        if (data.type === 'getDocument') {
            respond({ version: session.updates.length, doc: session.doc.toString() });
            return;
        }

        respond(null, `unknown type: ${data.type}`);
    };
};
