import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const ManagementPage = lazy(
    () => import('src/components/domain/admin/pages/ManagementPage'),
);

export const Route = createFileRoute('/_authenticated/manage/(admin)/settings' as any)({
    staticData: {
        breadcrumb: 'Settings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: ManagementPage,
});
