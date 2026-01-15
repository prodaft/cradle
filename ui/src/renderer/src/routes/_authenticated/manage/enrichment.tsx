import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EnrichmentPage = lazy(
    () => import('@/components/domain/admin/pages/EnrichmentPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/enrichment' as any,
)({
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EnrichmentPage,
});
