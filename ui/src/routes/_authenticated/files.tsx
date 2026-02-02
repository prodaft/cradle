import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const Files = lazy(() => import('@/components/domain/files/Files'));

export const Route = createFileRoute('/_authenticated/files')({
    staticData: {
        breadcrumb: 'Files',
    },
    validateSearch: z.object({
        files_page: z.coerce.number().optional(),
        files_sort_field: z.string().optional(),
        files_sort_direction: z.enum(['asc', 'desc']).optional(),
        files_pagesize: z.coerce.number().optional(),
    }),
    component: Files,
});
