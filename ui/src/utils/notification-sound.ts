import { notificationTitle } from '@/utils/notification-titles';

const CHIME_GAP_MS = 400;

let chimeUrl: string | null = null;
let lastPlayed = 0;

/** A short two-tone wav. An <audio> element can play it from a background tab. */
function chimeSrc(): string | null {
    if (chimeUrl) return chimeUrl;
    if (typeof URL === 'undefined' || typeof Blob === 'undefined') return null;

    const sampleRate = 44100;
    const duration = 0.22;
    const count = Math.floor(sampleRate * duration);
    const samples = new Int16Array(count);
    for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const attack = Math.min(1, t / 0.02);
        const release = Math.min(1, (duration - t) / 0.04);
        let wave = 0;
        if (t < 0.12) wave += Math.sin(2 * Math.PI * 880 * t);
        if (t >= 0.09 && t < 0.21) wave += Math.sin(2 * Math.PI * 1175 * t);
        const level = Math.max(-1, Math.min(1, wave * 0.2 * attack * release));
        samples[i] = level * 0x7fff;
    }

    const dataSize = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const write = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i] ?? 0, true);

    chimeUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    return chimeUrl;
}

function playChime(): Promise<boolean> {
    const src = chimeSrc();
    if (!src || typeof Audio === 'undefined') return Promise.resolve(false);
    const audio = new Audio(src);
    audio.volume = 0.7;
    return audio
        .play()
        .then(() => true)
        .catch(() => false);
}

/**
 * Ask once, without a click on the page. After this is allowed, a background tab
 * can also show the system notification.
 */
export function requestNotificationPermission(): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    void Notification.requestPermission().catch(() => {});
}

function ringInBackground(title: string, message: string, silent: boolean): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
        new Notification(title, { body: message || undefined, silent });
    } catch {
        // The chime already played, or the browser refused the popup.
    }
}

/** A short chime, including when this tab is not the one on screen. A burst rings once. */
export function playNotificationSound(notice?: {
    notificationType?: string;
    message?: string;
}): void {
    const hidden = document.visibilityState === 'hidden';
    const title = `CRADLE - ${notificationTitle(notice?.notificationType)}`;
    const message = notice?.message?.trim() ?? '';
    const nowMs = Date.now();
    const chiming = nowMs - lastPlayed >= CHIME_GAP_MS;
    if (chiming) lastPlayed = nowMs;

    if (!hidden) {
        if (chiming) void playChime();
        return;
    }

    if (!chiming) {
        ringInBackground(title, message, true);
        return;
    }
    void playChime().then((played) => ringInBackground(title, message, played));
}
