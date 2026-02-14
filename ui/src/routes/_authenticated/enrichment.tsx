import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EnrichmentLayout = lazy(
    () => import('@/components/domain/enrichment/EnrichmentLayout'),
);

export const Route = createFileRoute('/_authenticated/enrichment')({
    staticData: {
        breadcrumb: 'Enrichment',
    },
    component: EnrichmentLayout,
});
