import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const NotesList = lazy(() => import('@/components/domain/notes/notes-list'));

export const Route = createFileRoute('/_authenticated/notes/')({
    component: NotesList,
});
