import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const NotesListPage = lazy(() => import('@/components/domain/notes/NotesListPage'));

export const Route = createFileRoute('/_authenticated/notes/')({
    component: NotesListPage,
});
