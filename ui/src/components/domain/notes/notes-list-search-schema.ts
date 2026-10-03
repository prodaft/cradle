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
    content: z.string().optional(),
    author__username: z.string().optional(),
    editor__username: z.string().optional(),
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
        }),
});

/**
 * Dashboard route: tab/heading plus notes list filters when the Notes tab is active.
 * Loose so other embedded tabs (files_*, enrichment, activity) keep their own params.
 */
export const dashboardValidateSearchSchema = validateSearchSchema
    .extend({
        heading: z.string().optional(),
        tab: z
            .enum(['notes', 'relations', 'files', 'enrichment', 'eventlog'])
            .optional(),
    })
    .loose();
