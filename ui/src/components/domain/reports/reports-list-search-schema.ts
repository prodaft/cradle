import type { SearchSchema } from '@/lib/search-query/search-schema';
import { reportStatusEnumValues } from '@services/openapi/schema';
import startCase from 'lodash/startCase';
import * as z from 'zod';

export const validateSearchSchema = z.object({
    reports_page: z.coerce.number().optional(),
    reports_sort_field: z.string().optional(),
    reports_sort_direction: z.enum(['asc', 'desc']).optional().catch(undefined),
    reports_pagesize: z.coerce.number().optional(),
    search: z.string().optional(),
    status: z.enum(reportStatusEnumValues).optional().catch(undefined),
});

export const SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        {
            key: 'status',
            kind: 'enum',
            description: 'status',
            values: reportStatusEnumValues.map((value) => ({
                value,
                label: startCase(value),
            })),
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
