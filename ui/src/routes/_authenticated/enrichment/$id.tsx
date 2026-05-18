import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EnrichmentResults = lazy(
    () => import('@/components/domain/enrichment/enrichment-results'),
);

export const Route = createFileRoute('/_authenticated/enrichment/$id')({
    staticData: {
        breadcrumb: 'Enrichment Results',
    },
    component: EnrichmentResults,
});
