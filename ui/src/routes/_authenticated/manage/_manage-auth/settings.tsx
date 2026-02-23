import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const ManagementPage = lazy(
    () => import('@/components/domain/admin/settings/settings-page'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/settings' as any,
)({
    staticData: {
        breadcrumb: 'Settings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: ManagementPage,
});
