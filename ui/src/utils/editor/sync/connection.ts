import type { Update } from '@codemirror/collab';

/** Thrown when {@link EditorSyncConnection.close} runs while a request is in flight. */
export const EDITOR_SYNC_CONNECTION_CLOSED = 'Editor sync connection closed';

export type EditorSyncConnection = {
    getDocument(): Promise<{ version: number; doc: string }>;
    pushUpdates(version: number, updates: readonly Update[]): Promise<boolean>;
    pullUpdates(version: number): Promise<readonly Update[]>;
    close(): void;
    setPendingLocal?(pending: boolean): void;
};
