import type { SearchSchema } from '@/lib/search-query/search-schema';
import startCase from 'lodash/startCase';
import * as z from 'zod';

import { QUERY_SLUGS } from './digest-list-status';

export const validateSearchSchema = z.object({
    digests_page: z.coerce.number().optional(),
    digests_sort_field: z.string().optional(),
    digests_sort_direction: z.enum(['asc', 'desc']).optional().catch(undefined),
    digests_pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    user: z.string().optional(),
    created_at_gte: z.string().optional(),
    created_at_lte: z.string().optional(),
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
        {
            key: 'user',
            aliases: ['username', 'author'],
            kind: 'text',
            description: 'author username',
            example: 'alice',
        },
        { key: 'created', kind: 'date', description: 'created' },
    ],
    sortFields: [
        { value: 'title', label: 'Title' },
        { value: 'type', label: 'Type', api: 'digest_type' },
        { value: 'user', label: 'User' },
        { value: 'status', label: 'Status' },
        { value: 'created', label: 'Created At', api: 'created_at' },
    ],
};
