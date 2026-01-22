import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const TypeMappingsPage = lazy(
    () => import('src/components/domain/admin/pages/TypeMappingsPage'),
);

export const Route = createFileRoute(
    '/_authenticated/manage/(entry-manager)/type-mappings' as any,
)({
    staticData: {
        breadcrumb: 'Type Mappings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: TypeMappingsPage,
});
