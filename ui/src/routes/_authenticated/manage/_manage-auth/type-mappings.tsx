import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const TypeMappingsList = lazy(
    () => import('@/components/domain/manage/type-mappings/type-mappings-list'),
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
    component: TypeMappingsList,
});
