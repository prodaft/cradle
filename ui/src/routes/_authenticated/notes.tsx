import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

import { validateSearchSchema } from '@/components/domain/notes/notes-list-search-schema';

const NotesLayout = lazy(() => import('@/components/domain/notes/notes-layout'));

export const Route = createFileRoute('/_authenticated/notes')({
    staticData: {
        breadcrumb: 'Notes',
    },
    validateSearch: validateSearchSchema,
    component: NotesLayout,
});
