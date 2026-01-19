import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntryTypesPage = lazy(
    () => import('src/components/domain/admin/pages/EntryTypesPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/entry-types/$id' as any,
)({
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EntryTypesPage,
});