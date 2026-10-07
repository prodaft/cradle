import type { SearchSchema } from '@/lib/search-query/search-schema';
import startCase from 'lodash/startCase';
import * as z from 'zod';

import { QUERY_SLUGS } from './report-list-status';

export const validateSearchSchema = z.object({
    reports_page: z.coerce.number().optional(),
    reports_sort_field: z.string().optional(),
    reports_sort_direction: z.enum(['asc', 'desc']).optional().catch(undefined),
    reports_pagesize: z.coerce.number().optional(),
    search: z.string().optional(),
    status: z.enum(QUERY_SLUGS).optional().catch(undefined),
});

export const SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        {
            key: 'status',
            kind: 'enum',
            description: 'status',
            values: QUERY_SLUGS.map((value) => ({ value, label: startCase(value) })),
        },
    ],
    sortFields: [
        { value: 'title', label: 'Title' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'anonymized', label: 'Anonymized' },
        { value: 'status', label: 'Status' },
        { value: 'created', label: 'Created At', api: 'created_at' },
    ],
};
