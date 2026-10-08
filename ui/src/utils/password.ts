const PASSWORD_CHARSETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digit: '0123456789',
    special: '!@#$%^&*()-_=+',
} as const;

const PASSWORD_CHARS = Object.values(PASSWORD_CHARSETS).join('');
const DEFAULT_PASSWORD_LENGTH = 16;

function randomFrom(charset: string, count: number): string[] {
    const size = charset.length;
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const values = new Uint8Array(count);
        crypto.getRandomValues(values);
        return Array.from(values, (value) => charset.charAt(value % size));
    }
    return Array.from({ length: count }, () =>
        charset.charAt(Math.floor(Math.random() * size)),
    );
}

export function generatePassword({ length = DEFAULT_PASSWORD_LENGTH } = {}): string {
    const targetLength = Math.max(8, length);
    const chars = [
        ...Object.values(PASSWORD_CHARSETS).map(
            (charset) => randomFrom(charset, 1)[0]!,
        ),
        ...randomFrom(
            PASSWORD_CHARS,
            targetLength - Object.keys(PASSWORD_CHARSETS).length,
        ),
    ];

    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }

    return chars.join('');
}
