const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const stripApiSuffix = (value: string): string =>
    value.replace(/\/api\/?$/, '');

export const getApiBaseUrl = (value: string): string => {
    const base = stripApiSuffix(stripTrailingSlash(value));
    return `${base}/api`;
};

export const getCollabUrl = (value: string): string => {
    const base = stripApiSuffix(stripTrailingSlash(value));
    const withWs = base
        .replace(/^http:\/\//, 'ws://')
        .replace(/^https:\/\//, 'wss://');
    return `${withWs}/collab`;
};
