import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const TypeMappingsPage = lazy(
    () => import('@/components/domain/admin/type-mappings/type-mappings-page'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/type-mappings',
)({
    staticData: {
        breadcrumb: 'Type Mappings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: TypeMappingsPage,
});
