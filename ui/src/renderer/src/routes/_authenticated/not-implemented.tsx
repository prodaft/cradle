import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const FeatureNotImplemented = lazy(
    () => import('@/components/feedback/FeatureNotImplemented'),
);

export const Route = createFileRoute('/_authenticated/not-implemented')({
    component: FeatureNotImplemented,
});
