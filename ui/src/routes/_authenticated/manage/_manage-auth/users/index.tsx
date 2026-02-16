import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const UsersPage = lazy(() => import('@/components/domain/admin/user/users-page'));

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/users/')({
    validateSearch: z.object({
        users_page: z.coerce.number().optional(),
        users_pagesize: z.coerce.number().optional(),
        users_search: z.string().optional(),
    }),
    component: UsersPage,
});
