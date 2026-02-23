import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const DigestData = lazy(() => import('@/components/domain/digests/digest-data'));

export const Route = createFileRoute('/_authenticated/digest-data')({
    staticData: {
        breadcrumb: 'Digest Data',
    },
    validateSearch: z.object({
        digests_sort_field: z.string().optional(),
        digests_sort_direction: z.enum(['asc', 'desc']).optional(),
        digests_pagesize: z.coerce.number().optional(),
        title: z.string().optional(),
        author: z.string().optional(),
        created_at_gte: z.string().optional(),
        created_at_lte: z.string().optional(),
        status: z.string().optional(),
    }),
    component: DigestData,
});
