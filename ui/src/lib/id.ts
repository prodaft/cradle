const DEFAULT_LENGTH = 12;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateId({ length = DEFAULT_LENGTH } = {}): string {
    const targetLength = Math.max(1, length);
    const chars = ID_CHARS;
    const charsLength = chars.length;

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const randomValues = new Uint8Array(targetLength);
        crypto.getRandomValues(randomValues);
        return Array.from(randomValues, (value) => chars[value % charsLength]).join('');
    }

    let result = '';
    for (let i = 0; i < targetLength; i += 1) {
        result += chars[Math.floor(Math.random() * charsLength)];
    }
    return result;
}
