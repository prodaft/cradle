import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const ManageSettingsPage = lazy(
    () => import('@/components/domain/manage/settings/manage-settings-page'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/settings')({
    staticData: {
        breadcrumb: 'Settings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: ManageSettingsPage,
});
