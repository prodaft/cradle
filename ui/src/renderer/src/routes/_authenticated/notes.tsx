import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const Documents = lazy(() => import('@/components/domain/files/Documents'));

export const Route = createFileRoute('/_authenticated/notes')({
    validateSearch: z.object({
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
    }),
    component: Documents,
});
