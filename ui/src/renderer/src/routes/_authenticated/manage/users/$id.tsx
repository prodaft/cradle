import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const UsersPage = lazy(() => import('@/components/domain/admin/pages/UsersPage'));

export const Route = createFileRoute('/_authenticated/manage/users/$id')({
    component: UsersPage,
});
