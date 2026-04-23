import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const EnrichmentPage = lazy(
    () => import('@/components/domain/admin/enrichment/enrichment-page'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/enrichment')({
    staticData: {
        breadcrumb: 'Enrichment',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EnrichmentPage,
});
