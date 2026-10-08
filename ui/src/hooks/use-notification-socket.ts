import { queryKeys } from '@/hooks/query';
import { ReconnectTimer } from '@/utils/editor/sync/reconnect-timer';
import { requestNotificationPermission } from '@/utils/notification-sound';
import { claimNotificationToast, presentNotification } from '@/utils/notification-toasts';
import { apiWebSocketUrl } from '@/utils/websocket';
import { ensureClientSession, fetchClient } from '@services/openapi/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const PING_INTERVAL = 30_000;
const PONG_TIMEOUT = 10_000;
// Don't hold the badge forever if the socket never comes up.
const CONNECT_GIVE_UP = 5_000;

/**
 * Keeps a per-user WebSocket open while logged in. The server only signals that a
 * notification was created; the list and unread count stay on the HTTP API.
 *
 * Returns true once the unread count should load: the socket has joined, or the
 * attempt failed. The count is not fetched before that, so a notification created
 * during the handshake is included in that load. A later connect refetches.
 */
export function useNotificationSocket(enabled: boolean): boolean {
    const queryClient = useQueryClient();
    const [countReady, setCountReady] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setCountReady(false);
            return;
        }
        let closed = false;
        // Set once the socket joins. The give-up load runs only if it never does.
        let joined = false;
        let opening = false;
        let socket: WebSocket | null = null;
        let ping: ReturnType<typeof setInterval> | undefined;
        let pong: ReturnType<typeof setTimeout> | undefined;
        let invalidateTimer: ReturnType<typeof setTimeout> | undefined;
        // True once the unread count is allowed to load. A later `ready` refetches it.
        let allowed = false;

        const invalidate = () => {
            clearTimeout(invalidateTimer);
            invalidateTimer = setTimeout(() => {
                void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
            }, 200);
        };

        const allowCount = () => {
            if (closed || allowed) return;
            allowed = true;
            setCountReady(true);
        };

        const showUnread = async () => {
            const { data, error } = await fetchClient.GET('/notifications/', {
                params: { query: { page: 1, page_size: 20, unread_only: true } },
            });
            if (closed || error || !data) return;
            for (const item of data.results) {
                if (!claimNotificationToast(item.id)) continue;
                presentNotification(item.type, item.message);
            }
        };

        if (typeof WebSocket === 'undefined') {
            setCountReady(true);
            void showUnread();
            return () => {
                closed = true;
            };
        }

        const giveUp = setTimeout(() => {
            allowCount();
            if (!joined) void showUnread();
        }, CONNECT_GIVE_UP);
        requestNotificationPermission();

        const stopTimers = () => {
            clearInterval(ping);
            clearTimeout(pong);
            ping = undefined;
            pong = undefined;
        };

        const retry = new ReconnectTimer(
            () => {
                void open();
            },
            () => {},
        );

        async function open() {
            if (closed || opening || socket) return;
            opening = true;
            try {
                if (!(await ensureClientSession())) {
                    if (!closed) retry.schedule();
                    return;
                }
                if (closed || socket) return;

                let next: WebSocket;
                try {
                    next = new WebSocket(apiWebSocketUrl('/ws/notifications/'));
                } catch {
                    if (!closed) retry.schedule();
                    return;
                }
                socket = next;

                const armPong = () => {
                    clearTimeout(pong);
                    pong = setTimeout(() => {
                        if (socket === next) next.close();
                    }, PONG_TIMEOUT);
                };

                next.onopen = () => {
                    next.send(JSON.stringify({ type: 'auth' }));
                };
                next.onmessage = (event) => {
                    let data: {
                        type?: string;
                        id?: string;
                        message?: string;
                        notificationType?: string;
                    };
                    try {
                        data = JSON.parse(String(event.data));
                    } catch {
                        return;
                    }
                    if (data.type === 'pong') {
                        clearTimeout(pong);
                        pong = undefined;
                    } else if (data.type === 'ready') {
                        retry.resetBackoff();
                        clearTimeout(giveUp);
                        clearInterval(ping);
                        ping = setInterval(() => {
                            if (next.readyState === WebSocket.OPEN) {
                                next.send(JSON.stringify({ type: 'ping' }));
                                armPong();
                            }
                        }, PING_INTERVAL);
                        // The count may already have loaded (slow socket, or a reconnect).
                        // Unread rows are toasted here too, so one created while the socket was down
                        // still appears. Already shown ids are skipped.
                        if (allowed) invalidate();
                        joined = true;
                        void showUnread();
                        allowCount();
                    } else if (data.type === 'notification') {
                        const fresh = claimNotificationToast(data.id);
                        invalidate();
                        if (!fresh) return;
                        presentNotification(data.notificationType, data.message);
                    }
                };
                next.onclose = () => {
                    if (socket !== next) return;
                    socket = null;
                    stopTimers();
                    allowCount();
                    if (!closed) retry.schedule();
                };
            } finally {
                opening = false;
            }
        }

        void open();

        return () => {
            closed = true;
            clearTimeout(giveUp);
            retry.cancel();
            stopTimers();
            clearTimeout(invalidateTimer);
            if (socket) {
                socket.onclose = null;
                socket.close();
                socket = null;
            }
        };
    }, [enabled, queryClient]);

    return countReady;
}
