const BASE_DELAY = 500;
const MAX_DELAY = 10_000;
const MAX_HIDDEN_DELAY = 60_000;
const REQUEST_GAP = 1000;
const HINT_GAP = 5000;

/**
 * Schedules reconnect attempts with exponential backoff. Each delay is randomized, so
 * clients dropped together (e.g. by a server restart) don't all retry at the same moment.
 */
export class ReconnectTimer {
    at: number | null = null;
    private failures = 0;
    private lastAttempt = 0;
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly attempt: () => void,
        private readonly onChange: () => void,
    ) {}

    schedule() {
        const cap =
            document.visibilityState === 'hidden' ? MAX_HIDDEN_DELAY : MAX_DELAY;
        const delay = Math.min(BASE_DELAY * 2 ** this.failures, cap);
        this.failures++;
        this.setAt(Date.now() + delay * (0.5 + Math.random() / 2));
    }

    resetBackoff() {
        this.failures = 0;
    }

    retrySoon(minGap = REQUEST_GAP) {
        if (this.at === null) return;
        const at = Math.max(Date.now(), this.lastAttempt + minGap);
        if (at < this.at) this.setAt(at);
    }

    cancel() {
        if (this.at === null) return;
        clearTimeout(this.timer);
        this.setWatching(false);
        this.at = null;
        this.onChange();
    }

    private setAt(at: number) {
        clearTimeout(this.timer);
        this.at = at;
        this.timer = setTimeout(() => this.fire(), at - Date.now());
        this.setWatching(true);
        this.onChange();
    }

    private fire() {
        this.setWatching(false);
        this.at = null;
        this.lastAttempt = Date.now();
        this.onChange();
        this.attempt();
    }

    private readonly onHint = () => this.retrySoon(HINT_GAP);
    private readonly onVisibilityChange = () => {
        if (document.visibilityState === 'visible') this.onHint();
    };

    private setWatching(on: boolean) {
        const method = on ? 'addEventListener' : 'removeEventListener';
        window[method]('online', this.onHint);
        window[method]('pointerdown', this.onHint, true);
        window[method]('keydown', this.onHint, true);
        document[method]('visibilitychange', this.onVisibilityChange);
    }
}
