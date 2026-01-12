import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const TypeMappingsPage = lazy(
    () => import('@/components/domain/admin/pages/TypeMappingsPage'),
);

export const Route = createFileRoute('/_authenticated/manage/type-mappings')({
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: TypeMappingsPage,
});
