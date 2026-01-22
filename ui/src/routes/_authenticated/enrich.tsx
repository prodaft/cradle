import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EnrichmentRequests = lazy(
    () => import('src/components/domain/enrichment/EnrichmentRequests'),
);

export const Route = createFileRoute('/_authenticated/enrich')({
    staticData: {
        breadcrumb: 'Enrichment',
    },
    validateSearch: z.object({
        sort_field: z.string().optional(),
        sort_direction: z.enum(['asc', 'desc']).optional(),
        pagesize: z.coerce.number().optional(),
        title: z.string().optional(),
        user__username: z.string().optional(),
        status: z.string().optional(),
    }),
    component: EnrichmentRequests,
});
