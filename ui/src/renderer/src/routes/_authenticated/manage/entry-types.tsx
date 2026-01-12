import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const EntryTypesPage = lazy(
    () => import('@/components/domain/admin/pages/EntryTypesPage'),
);

export const Route = createFileRoute('/_authenticated/manage/entry-types')({
    component: EntryTypesPage,
});
