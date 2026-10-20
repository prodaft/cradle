/**
 * Query key factory for type-safe query keys
 * Centralizes all query keys to prevent typos and ensure consistency
 */

export const queryKeys = {
    // Notes
    notes: {
        apiList: () => ['get', '/notes/'] as const,
        apiDetail: (id: string) =>
            [
                'get',
                '/notes/{note_id}/',
                { params: { path: { note_id: id } } },
            ] as const,
        apiDetails: () => ['get', '/notes/{note_id}/'] as const,
    },

    // Reports
    reports: {
        all: ['reports'] as const,
        lists: () => [...queryKeys.reports.all, 'list'] as const,
        list: (params?: Record<string, unknown>) =>
            [...queryKeys.reports.lists(), params] as const,
    },

    // Files
    files: {
        apiList: () => ['get', '/files/'] as const,
        apiDetails: () => ['get', '/files/{file_id}/'] as const,
    },

    // Enrichment
    enrichment: {
        requests: {
            lists: () => ['enrichment', 'requests', 'list'] as const,
            list: (params?: Record<string, unknown>) =>
                ['enrichment', 'requests', 'list', params] as const,
        },
        results: {
            detail: (id: string) => ['enrichment', 'results', 'detail', id] as const,
            relations: (params: {
                id: string;
                enricherType: string;
                entryId?: number;
                page?: number;
                pageSize?: number;
                search?: string;
            }) => ['enrichment', 'results', 'relations', params] as const,
        },
    },

    // Knowledge Graph
    knowledgeGraph: {
        all: ['knowledgeGraph'] as const,
    },

    // Users
    users: {
        apiList: () => ['get', '/users/'] as const,
        apiDetails: () => ['get', '/users/{user_id}/'] as const,
    },

    // Entities
    entities: {
        all: ['entities'] as const,
        lists: () => [...queryKeys.entities.all, 'list'] as const,
        list: (filters?: { page?: number; pageSize?: number; search?: string }) =>
            [...queryKeys.entities.lists(), filters] as const,
        apiDetail: (id: number) =>
            [
                'get',
                '/entries/entities/{entity_id}/',
                { params: { path: { entity_id: id } } },
            ] as const,
    },

    // Lists that display entries: the entities list, and notes and files with their linked entities.
    // Refresh these whenever entries or entry types change.
    entryLists: () =>
        [
            queryKeys.entities.lists(),
            queryKeys.notes.apiList(),
            queryKeys.files.apiList(),
        ] as const,

    // Teams
    teams: {
        all: ['teams'] as const,
        lists: () => [...queryKeys.teams.all, 'list'] as const,
        list: (filters?: { page?: number; pageSize?: number; search?: string }) =>
            [...queryKeys.teams.lists(), filters] as const,
        detail: (id: string) => [...queryKeys.teams.all, 'detail', id] as const,
        members: (id: string) => [...queryKeys.teams.all, 'members', id] as const,
        access: (id: string) => [...queryKeys.teams.all, 'access', id] as const,
        entity: (entityId: number) =>
            [...queryKeys.teams.all, 'entity', entityId] as const,
        user: (userId: string) => [...queryKeys.teams.all, 'user', userId] as const,
    },

    // Entry Types
    entryTypes: {
        apiList: () => ['get', '/entries/entry-classes/'] as const,
        apiDetail: (subtype: string) =>
            [
                'get',
                '/entries/entry-classes/{class_subtype}/',
                { params: { path: { class_subtype: subtype } } },
            ] as const,
    },

    // Management
    management: {
        all: ['management'] as const,
        settings: () => [...queryKeys.management.all, 'settings'] as const,
    },

    // Notifications
    notifications: {
        all: ['notifications'] as const,
        list: (mode: 'all' | 'unread' = 'all') =>
            [...queryKeys.notifications.all, 'list', mode] as const,
        unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    },

    // Digests
    digests: {
        all: ['digests'] as const,
        lists: () => [...queryKeys.digests.all, 'list'] as const,
    },
} as const;
