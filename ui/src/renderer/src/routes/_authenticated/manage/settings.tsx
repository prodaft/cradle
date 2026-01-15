import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const ManagementPage = lazy(
    () => import('@/components/domain/admin/pages/ManagementPage'),
);

export const Route = createFileRoute('/_authenticated/manage/(admin)/settings' as any)({
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: ManagementPage,
});
