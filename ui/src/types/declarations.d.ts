// Type declarations for third-party libraries and module extensions

// ============================================================================
// Image and asset imports
// ============================================================================

declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.gif' {
    const content: string;
    export default content;
}

declare module '*.webp' {
    const content: string;
    export default content;
}

// ============================================================================
// CSS imports
// ============================================================================

declare module '*.css' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.scss' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.sass' {
    const content: Record<string, string>;
    export default content;
}

// ============================================================================
// Vite environment variables
// ============================================================================

interface ImportMetaEnv {
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    readonly VITE_API_BASE_URL: string;
    readonly VITE_ENV?: string;
    readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Build info injected via `define` in vite.config.ts
declare const __APP_VERSION_LABEL__: string;

declare module 'y-websocket';
