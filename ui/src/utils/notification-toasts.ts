import { playNotificationSound } from '@/utils/notification-sound';
import { notificationTitle, notificationToastIcon } from '@/utils/notification-titles';
import { toast } from 'sonner';

const STORAGE_KEY = 'cradle.shown-notification-toasts';
const VISIBLE_TOASTS = 3;
const shown = new Set<string>();
const waiting: Array<{ type?: string; message?: string }> = [];
const active = new Set<string | number>();
let loaded = false;
let open = 0;
let epoch = 0;

function loadShown(): void {
    if (loaded) return;
    loaded = true;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const ids: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ids)) return;
        for (const id of ids) {
            if (typeof id === 'string') shown.add(id);
        }
    } catch {
        // Private mode or a bad value. Toasts still show for this page load.
    }
}

function persistShown(): void {
    const ids = [...shown].slice(-200);
    if (ids.length !== shown.size) {
        shown.clear();
        for (const id of ids) shown.add(id);
    }
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Ignore storage failures.
    }
}

/**
 * True when this notification should be toasted. Remembers the id for this tab
 * session so a refresh does not repeat it.
 */
export function claimNotificationToast(id: string | undefined): boolean {
    loadShown();
    if (!id) return true;
    if (shown.has(id)) return false;
    shown.add(id);
    persistShown();
    return true;
}

/** Forget toasted ids so the next sign-in can show unread notifications again. */
export function clearShownNotificationToasts(): void {
    shown.clear();
    waiting.length = 0;
    open = 0;
    epoch += 1;
    loaded = true;
    const ids = [...active];
    active.clear();
    for (const id of ids) toast.dismiss(id);
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage failures.
    }
}

function releaseToast(): void {
    open = Math.max(0, open - 1);
    drainToasts();
}

function drainToasts(): void {
    while (open < VISIBLE_TOASTS && waiting.length > 0) {
        const next = waiting.shift();
        if (!next) return;
        open += 1;
        const text = next.message?.trim() ?? '';
        const shownAt = epoch;
        let released = false;
        let id: string | number = 0;
        const release = () => {
            if (released || shownAt !== epoch) return;
            released = true;
            active.delete(id);
            releaseToast();
        };
        id = toast(notificationTitle(next.type), {
            description: text || undefined,
            icon: notificationToastIcon(next.type),
            onAutoClose: release,
            onDismiss: release,
        });
        active.add(id);
    }
}

function showNotificationToast(type: string | undefined, message: string | undefined): void {
    waiting.push({ type, message });
    drainToasts();
}

export function presentNotification(type: string | undefined, message: string | undefined): void {
    showNotificationToast(type, message);
    playNotificationSound({ notificationType: type, message });
}
