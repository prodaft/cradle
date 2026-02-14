import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntryTypeSettingsPage = lazy(
    () => import('@/components/domain/admin/pages/EntryTypeSettingsPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/entry-types/$id' as any,
)({
    staticData: {
        breadcrumb: 'Entry Type Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EntryTypeSettingsPage,
});
