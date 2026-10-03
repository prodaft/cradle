import * as z from 'zod';

import { QUERY_SLUGS } from './digest-list-status';

export const validateSearchSchema = z.object({
    digests_page: z.coerce.number().optional(),
    digests_sort_field: z.string().optional(),
    digests_sort_direction: z.enum(['asc', 'desc']).optional(),
    digests_pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    created_at_gte: z.string().optional(),
    created_at_lte: z.string().optional(),
    status: z.enum(QUERY_SLUGS).optional(),
});
