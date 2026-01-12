import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EntitiesPage = lazy(() => import('@/components/domain/admin/pages/EntitiesPage'));

export const Route = createFileRoute('/_authenticated/manage/entities/$id')({
    component: EntitiesPage,
});
