/**
 * Query key factory for type-safe query keys
 * Centralizes all query keys to prevent typos and ensure consistency
 */

export const queryKeys = {
    // Notes
    notes: {
        all: ['notes'] as const,
        lists: () => [...queryKeys.notes.all, 'list'] as const,
        list: (filters?: {
            page?: number;
            pageSize?: number;
            sortField?: string;
            sortDirection?: 'asc' | 'desc';
            query?: Record<string, any>;
            columnFilters?: Record<string, any>;
        }) => [...queryKeys.notes.lists(), filters] as const,
        details: () => [...queryKeys.notes.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.notes.details(), id] as const,
    },

    // Reports
    reports: {
        all: ['reports'] as const,
        lists: () => [...queryKeys.reports.all, 'list'] as const,
        list: (filters?: {
            page?: number;
            pageSize?: number;
            sortField?: string;
            sortDirection?: 'asc' | 'desc';
            statusFilter?: string;
        }) => [...queryKeys.reports.lists(), filters] as const,
        details: () => [...queryKeys.reports.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.reports.details(), id] as const,
    },

    // Files
    files: {
        all: ['files'] as const,
        lists: () => [...queryKeys.files.all, 'list'] as const,
        list: (filters?: {
            page?: number;
            pageSize?: number;
            query?: Record<string, any>;
        }) => [...queryKeys.files.lists(), filters] as const,
        details: () => [...queryKeys.files.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.files.details(), id] as const,
    },

    // Enrichment
    enrichment: {
        all: ['enrichment'] as const,
        requests: {
            all: ['enrichment', 'requests'] as const,
            lists: () => ['enrichment', 'requests', 'list'] as const,
            list: (filters?: { page?: number; pageSize?: number }) =>
                ['enrichment', 'requests', 'list', filters] as const,
            details: () => ['enrichment', 'requests', 'detail'] as const,
            detail: (id: string) => ['enrichment', 'requests', 'detail', id] as const,
        },
        results: {
            all: ['enrichment', 'results'] as const,
            details: () => ['enrichment', 'results', 'detail'] as const,
            detail: (id: string) => ['enrichment', 'results', 'detail', id] as const,
            relations: (params: {
                id: string;
                enricherType: string;
                page?: number;
                pageSize?: number;
                query?: string;
                details?: string;
            }) => ['enrichment', 'results', 'relations', params] as const,
        },
    },

    // Activity
    activity: {
        all: ['activity'] as const,
        lists: () => [...queryKeys.activity.all, 'list'] as const,
        list: (filters?: {
            name?: string;
            objectId?: string;
            contentType?: string;
            username?: string;
        }) => [...queryKeys.activity.lists(), filters] as const,
    },

    // Knowledge Graph
    knowledgeGraph: {
        all: ['knowledgeGraph'] as const,
        graph: (page?: number) =>
            [...queryKeys.knowledgeGraph.all, 'graph', page] as const,
    },

    // Graph (Relations)
    graph: {
        all: ['graph'] as const,
        neighbors: (params: {
            src: string;
            depth: number;
            page: number;
            pageSize: number;
            query?: string;
            filters?: string[];
        }) => [...queryKeys.graph.all, 'neighbors', params] as const,
        inaccessible: (params: { src: string; depth: number }) =>
            [...queryKeys.graph.all, 'inaccessible', params] as const,
    },

    // Users
    users: {
        all: ['users'] as const,
        lists: () => [...queryKeys.users.all, 'list'] as const,
        list: (filters?: { page?: number; pageSize?: number }) =>
            [...queryKeys.users.lists(), filters] as const,
        details: () => [...queryKeys.users.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.users.details(), id] as const,
    },

    // Entities
    entities: {
        all: ['entities'] as const,
        lists: () => [...queryKeys.entities.all, 'list'] as const,
        list: (filters?: { page?: number; pageSize?: number }) =>
            [...queryKeys.entities.lists(), filters] as const,
        details: () => [...queryKeys.entities.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.entities.details(), id] as const,
    },

    // Entry Types
    entryTypes: {
        all: ['entryTypes'] as const,
        lists: () => [...queryKeys.entryTypes.all, 'list'] as const,
        list: (filters?: { page?: number; pageSize?: number }) =>
            [...queryKeys.entryTypes.lists(), filters] as const,
        details: () => [...queryKeys.entryTypes.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.entryTypes.details(), id] as const,
    },

    // Management
    management: {
        all: ['management'] as const,
        settings: () => [...queryKeys.management.all, 'settings'] as const,
    },

    // Digests
    digests: {
        all: ['digests'] as const,
        lists: () => [...queryKeys.digests.all, 'list'] as const,
        list: (filters?: {
            page?: number;
            pageSize?: number;
            title?: string;
            author?: string;
            status?: string;
            createdAtGte?: string;
            createdAtLte?: string;
            orderBy?: string;
        }) => [...queryKeys.digests.lists(), filters] as const,
        details: () => [...queryKeys.digests.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.digests.details(), id] as const,
    },
} as const;
