import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EntitiesPage = lazy(() => import('src/components/domain/admin/pages/EntitiesPage'));

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/entities/$id' as any,
)({
    component: EntitiesPage,
});
