import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const UserSettingsPage = lazy(
    () => import('@/components/domain/admin/pages/UserSettingsPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/users/$id' as any,
)({
    staticData: {
        breadcrumb: 'User Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: UserSettingsPage,
});
