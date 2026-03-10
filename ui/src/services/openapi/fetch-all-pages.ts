/**
 * Utilities for fetching all pages from paginated API endpoints.
 * Use when the UI needs the full dataset (e.g. dropdowns, autocomplete).
 */

import { fetchClient } from './client';

const PAGE_SIZE = 200;

function getResults<T>(data: unknown): T[] {
    if (!data || typeof data !== 'object') return [];
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.results)) return d.results as T[];
    if (Array.isArray(data)) return data as T[];
    return [];
}

function getTotalPages(data: unknown): number | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    return typeof d.total_pages === 'number' && d.total_pages > 0
        ? d.total_pages
        : null;
}

function getHasNext(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return d.has_next === true;
}

async function fetchAllPages<T>(
    fetcher: (params: {
        page: number;
        page_size: number;
    }) => Promise<{ data?: unknown }>,
): Promise<T[]> {
    const results: T[] = [];
    let page = 1;
    let totalPages: number | null = null;
    let hasNext = true;

    do {
        const result = await fetcher({ page, page_size: PAGE_SIZE });
        const { data, error, response } = result as {
            data?: unknown;
            error?: unknown;
            response?: Response;
        };
        if (error) throw { response, error };
        results.push(...getResults<T>(data));
        totalPages = getTotalPages(data);
        hasNext = getHasNext(data);
        page++;
    } while (
        (totalPages !== null && page <= totalPages) ||
        (totalPages === null && hasNext)
    );

    return results;
}

export async function fetchAllEntities(): Promise<
    Array<{ id: number; name: string; subtype: string; [key: string]: unknown }>
> {
    return fetchAllPages((params) =>
        fetchClient.GET('/entries/entities/', {
            params: { query: params } as Record<string, unknown>,
        }),
    );
}

export async function fetchAllEntryClasses(params?: {
    search?: string;
    show_count?: boolean;
}): Promise<Array<{ subtype: string; color?: string; [key: string]: unknown }>> {
    return fetchAllPages((pageParams) =>
        fetchClient.GET('/entries/entry-classes/', {
            params: { query: { ...pageParams, ...params } } as Record<string, unknown>,
        }),
    );
}

export async function fetchAllUserAccess(
    userId: string,
): Promise<
    Array<{ id: number; name: string; access_type: string; description?: string }>
> {
    return fetchAllPages((params) =>
        fetchClient.GET('/access/user/{user_id}/', {
            params: {
                path: { user_id: userId },
                query: params,
            } as {
                path: { user_id: string };
                query: { page: number; page_size: number };
            },
        }),
    );
}

export async function fetchAllEntityAccess(
    entityId: number,
    search?: string,
): Promise<Array<{ user: { id: string; username: string }; access_type: string }>> {
    return fetchAllPages((params) =>
        fetchClient.GET('/access/entity/{entity_id}/', {
            params: {
                path: { entity_id: entityId },
                query: search !== undefined ? { ...params, search } : params,
            } as {
                path: { entity_id: number };
                query: { page: number; page_size: number; search?: string };
            },
        }),
    );
}
