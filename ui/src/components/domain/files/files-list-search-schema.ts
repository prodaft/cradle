import {
    sortFromUrl,
    sortToOrderBy,
    sortToUrl,
    type SearchSchema,
    type SearchState,
} from '@/lib/search-query/search-schema';
import * as z from 'zod';

const FILE_STATUSES = ['healthy', 'warning'] as const;

type FileStatus = (typeof FILE_STATUSES)[number];

const DEFAULT_ORDER_BY = '-created_at';

/**
 * TanStack Router `validateSearch` for the files list (file-based `/files` and dock panel).
 * `files_search` holds the free-text part; qualifiers live in their own params.
 */
export const validateSearchSchema = z.object({
    files_page: z.coerce.number().optional(),
    files_sort_field: z.string().optional(),
    files_sort_direction: z.enum(['asc', 'desc']).optional(),
    files_pagesize: z.coerce.number().optional(),
    files_search: z.string().optional(),
    files_status: z.enum(FILE_STATUSES).optional().catch(undefined),
    files_mimetype: z.string().optional(),
});

export const FILES_SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        {
            key: 'status',
            kind: 'enum',
            description: 'status',
            values: [
                { value: 'healthy', label: 'Healthy (hashed)' },
                { value: 'warning', label: 'Warning (missing hash)' },
            ],
        },
        {
            key: 'mimetype',
            kind: 'text',
            aliases: ['type'],
            description: 'mimetype, * wildcard',
            example: 'image/*',
            values: [
                { value: 'application/pdf' },
                { value: 'image/*' },
                { value: 'text/*' },
            ],
        },
    ],
    sortFields: [
        { value: 'file_name', api: 'name' },
        { value: 'created', api: 'created_at' },
        { value: 'mimetype', api: 'mime_type' },
        { value: 'file_size', api: 'size' },
    ],
};

interface FilesUrlState {
    files_search?: string;
    files_status?: FileStatus;
    files_mimetype?: string;
    files_sort_field?: string;
    files_sort_direction?: 'asc' | 'desc';
}

export function searchStateFromUrl(search: Record<string, unknown>): SearchState {
    const str = (key: string) =>
        typeof search[key] === 'string' && search[key] ? (search[key] as string) : '';
    const values: Record<string, string[]> = {};
    const status = str('files_status');
    if ((FILE_STATUSES as readonly string[]).includes(status)) values.status = [status];
    const mimetype = str('files_mimetype');
    if (mimetype) values.mimetype = [mimetype];

    return {
        q: str('files_search') || undefined,
        values,
        dates: {},
        sort: sortFromUrl(
            search.files_sort_field,
            search.files_sort_direction,
            FILES_SEARCH_SCHEMA,
        ),
    };
}

export function urlFromSearchState(state: SearchState): FilesUrlState {
    const sort = sortToUrl(state.sort, FILES_SEARCH_SCHEMA);
    return {
        files_search: state.q || undefined,
        files_status: state.values.status?.[0] as FileStatus | undefined,
        files_mimetype: state.values.mimetype?.[0] || undefined,
        files_sort_field: sort.field,
        files_sort_direction: sort.direction,
    };
}

export function orderByFromUrl(search: Record<string, unknown>): string {
    return (
        sortToOrderBy(
            sortFromUrl(
                search.files_sort_field,
                search.files_sort_direction,
                FILES_SEARCH_SCHEMA,
            ),
            FILES_SEARCH_SCHEMA,
        ) ?? DEFAULT_ORDER_BY
    );
}
