import useApi from '@/hooks/api/useApi';
import { useAuthActions, useAuthState } from '@/hooks/auth/useAuth';
import { useProfile } from '@/hooks/user/useProfile';
import { getCollabUrl } from '@/utils/url';
import { Extension } from '@codemirror/state';
import { useEffect, useMemo, useRef, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

type CollabStatus = 'connecting' | 'connected' | 'disconnected';

type CollabState = {
    extension: Extension | null;
    status: CollabStatus;
    synced: boolean;
    yText: Y.Text | null;
};

export function useCollabExtension(noteId: string, enabled: boolean): CollabState {
    const { role } = useAuthState();
    const { getAccessToken } = useAuthActions();
    const { basePath } = useApi();
    const { profile } = useProfile();
    const [extension, setExtension] = useState<Extension | null>(null);
    const [status, setStatus] = useState<CollabStatus>('disconnected');
    const [synced, setSynced] = useState(false);
    const [yText, setYText] = useState<Y.Text | null>(null);
    const awarenessRef = useRef<Awareness | null>(null);

    const collabUrl = useMemo(() => getCollabUrl(basePath), [basePath]);
    const displayName = useMemo(() => {
        if (!profile) return 'Anonymous';
        const name = [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        return name || profile.username || 'Anonymous';
    }, [profile]);
    const userColor = useMemo(
        () => hashToColor(profile?.id || profile?.username || 'anonymous'),
        [profile?.id, profile?.username],
    );

    useEffect(() => {
        const awareness = awarenessRef.current;
        if (!awareness) return;
        awareness.setLocalStateField('user', {
            name: displayName,
            color: userColor,
        });
    }, [displayName, userColor]);

    useEffect(() => {
        if (!enabled || !noteId) {
            setExtension(null);
            setStatus('disconnected');
            setSynced(false);
            setYText(null);
            awarenessRef.current = null;
            return;
        }

        let active = true;
        const doc = new Y.Doc();
        const ytext = doc.getText('content');
        setYText(ytext);
        let provider: InstanceType<typeof WebsocketProvider> | null = null;
        let observerAdded = false;
        const handleYTextChange = () => {
            console.debug('[Collab] content updated', {
                noteId,
                contentLength: ytext.length,
            });
        };

        const connect = async () => {
            try {
                const token = await getAccessToken();
                if (!active) return;
                provider = new WebsocketProvider(collabUrl, noteId, doc, {
                    protocols: ['Bearer', token],
                });

                provider.on('status', (event: { status: CollabStatus }) => {
                    if (active) {
                        setStatus(event.status);
                    }
                });
                provider.on('sync', (synced: boolean) => {
                    console.debug('[Collab] sync status', {
                        noteId,
                        synced,
                        contentLength: ytext.length,
                    });
                    if (active) {
                        setSynced(synced);
                    }
                });

                ytext.observe(handleYTextChange);
                observerAdded = true;

                awarenessRef.current = provider.awareness;
                provider.awareness.setLocalStateField('user', {
                    name: displayName,
                    color: userColor,
                });

                setExtension(yCollab(ytext, provider.awareness));
                setStatus('connecting');
                setSynced(false);
            } catch (error) {
                console.error('Failed to connect to collab server:', error);
                setStatus('disconnected');
            }
        };

        connect();

        return () => {
            active = false;
            if (observerAdded) {
                ytext.unobserve(handleYTextChange);
            }
            provider?.destroy();
            doc.destroy();
            setExtension(null);
            setStatus('disconnected');
            setSynced(false);
            setYText(null);
            awarenessRef.current = null;
        };
    }, [collabUrl, displayName, enabled, getAccessToken, noteId, role, userColor]);

    return { extension, status, synced, yText };
}

function hashToColor(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}
