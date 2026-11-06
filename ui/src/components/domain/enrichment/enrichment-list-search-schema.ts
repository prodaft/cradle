import type { SearchSchema } from '@/lib/search-query/search-schema';
import { enrichmentStatusEnumValues } from '@services/openapi/schema';
import startCase from 'lodash/startCase';
import * as z from 'zod';

export const validateSearchSchema = z.object({
    page: z.coerce.number().optional(),
    sort_field: z.string().optional(),
    sort_direction: z.enum(['asc', 'desc']).optional().catch(undefined),
    pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    user: z.string().optional(),
    status: z.enum(enrichmentStatusEnumValues).optional().catch(undefined),
});

export const SEARCH_SCHEMA: SearchSchema = {
    qualifiers: [
        {
            key: 'status',
            kind: 'enum',
            description: 'status',
            values: enrichmentStatusEnumValues.map((value) => ({
                value,
                label: startCase(value),
            })),
        },
        {
            key: 'user',
            kind: 'text',
            description: 'requested by',
            aliases: ['username'],
            example: 'alice',
        },
    ],
    sortFields: [
        { value: 'title', label: 'Title' },
        { value: 'user', label: 'User' },
        { value: 'status', label: 'Status' },
        { value: 'created', label: 'Created At', api: 'created_at' },
    ],
};
