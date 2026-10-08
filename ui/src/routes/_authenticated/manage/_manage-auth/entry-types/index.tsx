import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const EntryTypesList = lazy(
    () => import('@/components/domain/manage/entry-type/entry-types-list'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/entry-types/',
)({
    validateSearch: z.object({
        entry_types_page: z.coerce.number().optional(),
        entry_types_pagesize: z.coerce.number().optional(),
        entry_types_search: z.string().optional(),
    }),
    component: EntryTypesList,
});
