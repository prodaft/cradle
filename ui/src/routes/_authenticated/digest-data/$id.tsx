import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const DigestDetail = lazy(() => import('@/components/domain/digests/digest-detail'));

export const Route = createFileRoute('/_authenticated/digest-data/$id')({
    staticData: {
        breadcrumb: 'Digest',
    },
    component: DigestDetail,
});
