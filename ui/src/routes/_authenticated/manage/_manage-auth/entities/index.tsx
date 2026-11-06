import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const EntitiesList = lazy(
    () => import('@/components/domain/manage/entity/entities-list'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/entities/')({
    validateSearch: z.object({
        entities_page: z.coerce.number().optional(),
        entities_pagesize: z.coerce.number().optional(),
        entities_search: z.string().optional(),
    }),
    component: EntitiesList,
});
