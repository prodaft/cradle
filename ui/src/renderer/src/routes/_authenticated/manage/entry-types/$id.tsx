import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EntryTypesPage = lazy(
    () => import('@/components/domain/admin/pages/EntryTypesPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/entry-types/$id' as any,
)({
    component: EntryTypesPage,
});
