import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const NoteViewer = lazy(() => import('src/components/domain/notes/NoteViewer'));

export const Route = createFileRoute('/_authenticated/notes/$id')({
    staticData: {
        breadcrumb: (match: any) => `Note ${match.params.id.slice(0, 8)}...`,
    },
    validateSearch: z.object({
        heading: z.string().optional(),
        view: z.enum(['content', 'graph', 'history', 'files']).optional(),
        edit: z.boolean().optional(),
        source: z.boolean().optional(),
    }),
    component: NoteViewer,
});
