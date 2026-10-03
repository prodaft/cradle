import * as z from 'zod';

import { QUERY_SLUGS } from './report-list-status';

export const validateSearchSchema = z.object({
    reports_page: z.coerce.number().optional(),
    reports_sort_field: z.string().optional(),
    reports_sort_direction: z.enum(['asc', 'desc']).optional(),
    reports_pagesize: z.coerce.number().optional(),
    search: z.string().optional(),
    status: z.enum(QUERY_SLUGS).optional(),
});
