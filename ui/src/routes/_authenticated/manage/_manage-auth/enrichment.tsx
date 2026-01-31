import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EnrichmentPage = lazy(
    () => import('src/components/domain/admin/pages/EnrichmentPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/enrichment' as any,
)({
    staticData: {
        breadcrumb: 'Enrichment',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EnrichmentPage,
});
