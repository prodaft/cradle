import { Spinner } from '@/components/ui/spinner';
import { useEffect, useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';

export type ConnectionNotice = 'unreachable' | 'paused' | 'offline';

const CONNECTION_NOTICES: Record<
    ConnectionNotice,
    { title: string; description?: string }
> = {
    unreachable: {
        title: "Can't reach the server",
        description: 'Editing is unavailable until it connects.',
    },
    paused: {
        title: 'Connection lost with unsaved changes.',
        description:
            'Don’t reload or close this tab. Your changes will save when we get the connection back.',
    },
    offline: { title: 'Lost Connection' },
};

function useSecondsUntil(at: number | null): number | null {
    const [now, setNow] = useState(() => Date.now());
    useLayoutEffect(() => {
        if (at === null) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
    }, [at]);
    return at === null ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/**
 * Keeps the live-connection toast up while `notice` lasts. With `reconnect`, it counts
 * down to the next attempt (`at`; null while one is running) and offers to start it now.
 * Rendered on its own so the countdown doesn't re-render the editor.
 */
export function ConnectionToast({
    id,
    notice,
    reconnect,
}: {
    id: string;
    notice: ConnectionNotice | null;
    reconnect: { at: number | null; now: () => void } | null;
}) {
    const seconds = useSecondsUntil(reconnect?.at ?? null);
    const retryNow = reconnect?.now;

    useEffect(() => {
        if (!notice) return;
        return () => {
            toast.dismiss(id);
        };
    }, [id, notice]);

    useEffect(() => {
        if (!notice) return;
        const { title, description } = CONNECTION_NOTICES[notice];
        const message = !retryNow ? (
            title
        ) : (
            <>
                <strong>{title}</strong>{' '}
                {seconds ? `Reconnecting in ${seconds} secs.` : 'Reconnecting…'}
            </>
        );
        toast.warning(message, {
            id,
            description,
            duration: Infinity,
            icon: retryNow && !seconds ? <Spinner /> : undefined,
            action:
                retryNow && seconds
                    ? {
                          label: 'Reconnect',
                          onClick: (event) => {
                              event.preventDefault();
                              retryNow();
                          },
                      }
                    : undefined,
        });
    }, [id, notice, retryNow, seconds]);

    return null;
}
