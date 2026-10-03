import * as z from 'zod';

import { QUERY_SLUGS } from './enrichment-list-status';

export const validateSearchSchema = z.object({
    page: z.coerce.number().optional(),
    sort_field: z.string().optional(),
    sort_direction: z.enum(['asc', 'desc']).optional(),
    pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    user__username: z.string().optional(),
    status: z.enum(QUERY_SLUGS).optional(),
});
