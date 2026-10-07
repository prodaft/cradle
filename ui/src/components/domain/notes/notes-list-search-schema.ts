import { dateRangeFromUrl } from '@/lib/search-query/dates';
import {
    sortFromUrl,
    sortToOrderBy,
    sortToUrl,
    type DateRange,
    type QualifierSpec,
    type SearchSchema,
    type SearchState,
} from '@/lib/search-query/search-schema';
import * as z from 'zod';

import { QUERY_SLUGS, dedupeSlugs, type StatusSlug } from './note-list-status';

const slug = z.enum(QUERY_SLUGS);

/**
 * TanStack Router `validateSearch` for notes list routes (file-based `/notes` and dock panel).
 * Single definition so query params (including repeat `status`) stay aligned across routers.
 */
export const validateSearchSchema = z.object({
    notes_page: z.coerce.number().optional(),
    notes_sort_field: z.string().optional(),
    notes_sort_direction: z.enum(['asc', 'desc']).optional(),
    notes_pagesize: z.coerce.number().optional(),
    author: z.string().optional(),
    editor: z.string().optional(),
    created_date_from: z.string().optional(),
    created_date_to: z.string().optional(),
    updated_date_from: z.string().optional(),
    updated_date_to: z.string().optional(),
    any_field: z.string().optional(),
    status: z
        .union([slug, z.array(slug)])
        .optional()
        .transform((v): StatusSlug[] | undefined => {
            if (v === undefined) return undefined;
            const deduped = dedupeSlugs(Array.isArray(v) ? v : [v]);
            return deduped.length ? deduped : undefined;
        })
        .catch(undefined),
});

/**
 * Dashboard route: tab/heading plus notes list filters when the Notes tab is active.
 * Loose so other embedded tabs (files_*, enrichment, activity) keep their own params.
 */
export const dashboardValidateSearchSchema = validateSearchSchema
    .extend({
        heading: z.string().optional(),
        tab: z
            .enum(['notes', 'relations', 'files', 'enrichment', 'eventlog', 'entries'])
            .optional(),
    })
    .loose();

const STATUS_VALUES: readonly { value: StatusSlug; label: string }[] = [
    { value: 'fleeting', label: 'Fleeting (your drafts)' },
    { value: 'finalized', label: 'Finalized (any status)' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'warning', label: 'Warning' },
    { value: 'invalid', label: 'Invalid' },
    { value: 'processing', label: 'Processing' },
];

const DEFAULT_ORDER_BY = '-created_at';

function notesSearchSchema(withFleeting: boolean): SearchSchema {
    const qualifiers: QualifierSpec[] = [
        {
            key: 'status',
            kind: 'enum',
            description: 'status',
            multiple: true,
            values: withFleeting
                ? STATUS_VALUES
                : STATUS_VALUES.filter((v) => v.value !== 'fleeting'),
        },
        {
            key: 'author',
            kind: 'text',
            description: 'author username',
            example: 'alice',
        },
        {
            key: 'editor',
            kind: 'text',
            description: 'last editor username',
            example: 'bob',
        },
        { key: 'created', kind: 'date', description: 'created' },
        { key: 'updated', kind: 'date', description: 'updated' },
    ];
    return {
        qualifiers,
        sortFields: [
            { value: 'title' },
            { value: 'author' },
            { value: 'editor' },
            { value: 'created', api: 'created_at' },
            { value: 'updated', api: 'updated_at' },
        ],
    };
}

export const NOTES_SEARCH_SCHEMA = notesSearchSchema(true);

/** For entry-scoped lists, which never show fleeting notes. */
export const NOTES_SEARCH_SCHEMA_NO_FLEETING = notesSearchSchema(false);

/** Notes list URL params driven by the search bar. */
interface NotesSearchUrlState {
    any_field?: string;
    status?: StatusSlug[];
    author?: string;
    editor?: string;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
    notes_sort_field?: string;
    notes_sort_direction?: 'asc' | 'desc';
}

/**
 * Applied SearchState from URL params. `withFleeting: false` (entry-scoped lists, using
 * NOTES_SEARCH_SCHEMA_NO_FLEETING) drops `fleeting` so the box text still parses.
 */
export function searchStateFromUrl(
    search: Record<string, unknown>,
    withFleeting = true,
): SearchState {
    const str = (key: string) =>
        typeof search[key] === 'string' && search[key] ? (search[key] as string) : '';
    const values: Record<string, string[]> = {};
    const statuses = Array.isArray(search.status)
        ? (search.status as string[]).filter((s) => withFleeting || s !== 'fleeting')
        : [];
    if (statuses.length > 0) values.status = statuses;
    if (str('author')) values.author = [str('author')];
    if (str('editor')) values.editor = [str('editor')];

    const dates: Record<string, DateRange> = {};
    const created = dateRangeFromUrl(search.created_date_from, search.created_date_to);
    if (created) dates.created = created;
    const updated = dateRangeFromUrl(search.updated_date_from, search.updated_date_to);
    if (updated) dates.updated = updated;

    return {
        q: str('any_field') || undefined,
        values,
        dates,
        sort: sortFromUrl(
            search.notes_sort_field,
            search.notes_sort_direction,
            NOTES_SEARCH_SCHEMA,
        ),
    };
}

/** URL params for an applied SearchState; `undefined` clears a param. */
export function urlFromSearchState(state: SearchState): NotesSearchUrlState {
    const { created, updated } = state.dates;
    const statuses = state.values.status as StatusSlug[] | undefined;
    const sort = sortToUrl(state.sort, NOTES_SEARCH_SCHEMA);
    return {
        any_field: state.q || undefined,
        status: statuses?.length ? statuses : undefined,
        author: state.values.author?.[0] || undefined,
        editor: state.values.editor?.[0] || undefined,
        created_date_from: created?.after,
        created_date_to: created?.before,
        updated_date_from: updated?.after,
        updated_date_to: updated?.before,
        notes_sort_field: sort.field,
        notes_sort_direction: sort.direction,
    };
}

/** API `order_by` from the URL sort params; unknown fields fall back to newest first. */
export function orderByFromUrl(search: Record<string, unknown>): string {
    return (
        sortToOrderBy(
            sortFromUrl(
                search.notes_sort_field,
                search.notes_sort_direction,
                NOTES_SEARCH_SCHEMA,
            ),
            NOTES_SEARCH_SCHEMA,
        ) ?? DEFAULT_ORDER_BY
    );
}
