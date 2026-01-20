import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const Reports = lazy(() => import('src/components/domain/reports/Reports'));

export const Route = createFileRoute('/_authenticated/reports')({
    validateSearch: z.object({
        reports_page: z.coerce.number().optional(),
        reports_sort_field: z.string().optional(),
        reports_sort_direction: z.enum(['asc', 'desc']).optional(),
        reports_pagesize: z.coerce.number().optional(),
    }),
    component: Reports,
});
