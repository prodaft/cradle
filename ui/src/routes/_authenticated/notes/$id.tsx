import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const NoteViewer = lazy(() => import('src/components/domain/notes/NoteViewer'));

export const Route = createFileRoute('/_authenticated/notes/$id')({
    validateSearch: z.object({
        heading: z.string().optional(),
    }),
    component: NoteViewer,
});
