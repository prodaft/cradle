import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntitiesPage = lazy(
    () => import('src/components/domain/admin/pages/EntitiesPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/entities/$id' as any,
)({
    staticData: {
        breadcrumb: 'Entity Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: EntitiesPage,
});
