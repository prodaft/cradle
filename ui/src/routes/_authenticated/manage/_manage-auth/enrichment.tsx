import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const ManageEnrichmentList = lazy(
    () => import('@/components/domain/manage/enrichment/manage-enrichment-list'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/enrichment')({
    staticData: {
        breadcrumb: 'Enrichment',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: ManageEnrichmentList,
});
