import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const UserSettingsPage = lazy(
    () => import('@/components/domain/admin/user/user-settings-page'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/users/$id')({
    staticData: {
        breadcrumb: 'User Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: UserSettingsPage,
});
