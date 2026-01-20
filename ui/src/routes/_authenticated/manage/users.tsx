import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const UsersPage = lazy(() => import('src/components/domain/admin/pages/UsersPage'));

export const Route = createFileRoute('/_authenticated/manage/(admin)/users' as any)({
    validateSearch: z.object({
        users_page: z.coerce.number().optional(),
        users_pagesize: z.coerce.number().optional(),
    }),
    component: UsersPage,
});
