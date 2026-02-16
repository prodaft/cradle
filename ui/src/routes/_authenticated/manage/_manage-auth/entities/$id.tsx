import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntitySettingsPage = lazy(
    () => import('@/components/domain/admin/entity/entity-settings-page'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/entities/$id' as any,
)({
    staticData: {
        breadcrumb: 'Entity Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EntitySettingsPage,
});
