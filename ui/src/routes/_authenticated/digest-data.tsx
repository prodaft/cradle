import { validateSearchSchema } from '@/components/domain/digests/digests-list-search-schema';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const DigestsList = lazy(() => import('@/components/domain/digests/digests-list'));

export const Route = createFileRoute('/_authenticated/digest-data')({
    staticData: {
        breadcrumb: 'Digest Data',
    },
    validateSearch: validateSearchSchema,
    component: DigestsList,
});
