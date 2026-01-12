import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const EntitiesPage = lazy(() => import('@/components/domain/admin/pages/EntitiesPage'));

export const Route = createFileRoute('/_authenticated/manage/entities')({
    validateSearch: z.object({
        entities_page: z.coerce.number().optional(),
        entities_pagesize: z.coerce.number().optional(),
    }),
    component: EntitiesPage,
});
