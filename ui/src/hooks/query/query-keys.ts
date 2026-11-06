/**
 * Query key factory for type-safe query keys
 * Centralizes all query keys to prevent typos and ensure consistency.
 *
 * API queries use openapi-react-query keys: ``['get', path, init?]``. ``apiKey(path)`` is the prefix
 * that matches every query on that path, whatever its params, so it is what invalidation uses.
 */

import type { paths } from '@services/openapi/schema';
import type { QueryKey } from '@tanstack/react-query';

/** Paths with a GET operation. */
type GetPath = {
    [P in keyof paths]: paths[P] extends { get: object } ? P : never;
}[keyof paths];

/** Prefix of every ``$api`` GET query on ``path``. */
export const apiKey = <P extends GetPath>(path: P) => ['get', path] as const;

/** Mutation ``meta.invalidateQueries`` entries for one or more key prefixes. */
export const invalidate = (...keys: readonly QueryKey[]) =>
    keys.map((queryKey) => ({ queryKey }));

export const queryKeys = {
    // Notes
    notes: {
        apiList: () => apiKey('/notes/'),
        apiDetail: (id: string) =>
            [
                ...apiKey('/notes/{note_id}/'),
                { params: { path: { note_id: id } } },
            ] as const,
        apiDetails: () => apiKey('/notes/{note_id}/'),
    },

    // Reports
    reports: {
        lists: () => apiKey('/reports/'),
    },

    // Files
    files: {
        apiList: () => apiKey('/files/'),
        apiDetails: () => apiKey('/files/{file_id}/'),
    },

    // Enrichment
    enrichment: {
        requests: {
            lists: () => apiKey('/intelio/enrichments/'),
        },
    },

    // Knowledge Graph
    knowledgeGraph: {
        full: () => [...apiKey('/knowledge-graph/'), 'full'] as const,
        all: () =>
            [
                apiKey('/knowledge-graph/'),
                apiKey('/knowledge-graph/paths/'),
                apiKey('/knowledge-graph/neighbors/'),
                apiKey('/knowledge-graph/inaccessible/'),
            ] as const,
    },

    // Users
    users: {
        apiList: () => apiKey('/users/'),
        apiDetails: () => apiKey('/users/{user_id}/'),
        sessions: () => apiKey('/users/{user_id}/sessions/'),
    },

    // Effective access: per-user access on an entity, and a user's access across entities.
    // Without an id the key matches every entity or user.
    access: {
        entityUsers: (entityId?: number) =>
            entityId === undefined
                ? apiKey('/entries/entities/{entity_id}/access/users/')
                : ([
                      ...apiKey('/entries/entities/{entity_id}/access/users/'),
                      { params: { path: { entity_id: entityId } } },
                  ] as const),
        users: (userId?: string) =>
            userId === undefined
                ? apiKey('/users/{user_id}/access/')
                : ([
                      ...apiKey('/users/{user_id}/access/'),
                      { params: { path: { user_id: userId } } },
                  ] as const),
    },

    // Entities
    entities: {
        lists: () => apiKey('/query/'),
        stream: () => apiKey('/entries/entities/stream/'),
        details: () => apiKey('/entries/entities/{entity_id}/'),
        apiDetail: (id: number) =>
            [
                ...apiKey('/entries/entities/{entity_id}/'),
                { params: { path: { entity_id: id } } },
            ] as const,
        all: () =>
            [
                queryKeys.entities.lists(),
                queryKeys.entities.stream(),
                queryKeys.entities.details(),
            ] as const,
    },

    // Lists that display entries: the entities list, and notes and files with their linked entities.
    // Refresh these whenever entries or entry types change.
    entryLists: () =>
        [
            queryKeys.entities.lists(),
            queryKeys.entities.stream(),
            queryKeys.notes.apiList(),
            queryKeys.files.apiList(),
        ] as const,

    // Teams: lists, details, members, access grants and memberships.
    teams: {
        all: () =>
            [
                apiKey('/teams/'),
                apiKey('/teams/{team_id}/'),
                apiKey('/teams/{team_id}/members/'),
                apiKey('/teams/{team_id}/candidates/'),
                apiKey('/teams/{team_id}/access/'),
                apiKey('/entries/entities/{entity_id}/access/teams/'),
                apiKey('/users/{user_id}/teams/'),
                apiKey('/users/me/teams/'),
            ] as const,
        lists: () => apiKey('/teams/'),
    },

    // Entry Types
    entryTypes: {
        apiList: () => apiKey('/entries/entry-classes/'),
        stream: () => apiKey('/entries/entry-classes/stream/'),
        apiDetail: (subtype: string) =>
            [
                ...apiKey('/entries/entry-classes/{class_subtype}/'),
                { params: { path: { class_subtype: subtype } } },
            ] as const,
    },

    // Management
    management: {
        settings: () => apiKey('/management/settings/'),
    },

    // Notifications
    notifications: {
        unreadCount: () => apiKey('/notifications/unread-count/'),
        all: () =>
            [apiKey('/notifications/'), queryKeys.notifications.unreadCount()] as const,
    },

    // Digests
    digests: {
        all: () =>
            [
                queryKeys.digests.lists(),
                apiKey('/intelio/digests/{digest_id}/'),
                queryKeys.digests.relations(),
                queryKeys.digests.notes(),
            ] as const,
        lists: () => apiKey('/intelio/digests/'),
        relations: () => apiKey('/intelio/digests/{digest_id}/relations/'),
        notes: () => apiKey('/intelio/digests/{digest_id}/notes/'),
    },
} as const;
