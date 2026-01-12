import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EnrichmentResults = lazy(
    () => import('@/components/domain/enrichment/EnrichmentResults'),
);

export const Route = createFileRoute('/_authenticated/enrichment/$id')({
    component: EnrichmentResults,
});
