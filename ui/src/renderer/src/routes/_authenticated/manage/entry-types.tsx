import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntryTypesPage = lazy(
    () => import('@/components/domain/admin/pages/EntryTypesPage'),
);

export const Route = createFileRoute(
    ('/_authenticated/manage/(entry-manager)/entry-types' as any),
)({
    validateSearch: z.object({
        entry_types_page: z.coerce.number().optional(),
        entry_types_pagesize: z.coerce.number().optional(),
    }),
    component: EntryTypesPage,
});
