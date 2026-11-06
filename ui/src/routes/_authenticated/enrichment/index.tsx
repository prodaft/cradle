import { validateSearchSchema } from '@/components/domain/enrichment/enrichment-list-search-schema';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EnrichmentList = lazy(
    () => import('@/components/domain/enrichment/enrichment-list'),
);

export const Route = createFileRoute('/_authenticated/enrichment/')({
    validateSearch: validateSearchSchema,
    component: EnrichmentList,
});
