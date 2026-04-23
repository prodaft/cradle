import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const EntryTypeSettingsPage = lazy(
    () => import('@/components/domain/admin/entry-type/entry-type-settings-page'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/entry-types/$id',
)({
    staticData: {
        breadcrumb: 'Entry Type Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EntryTypeSettingsPage,
});
