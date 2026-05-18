import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const UsersList = lazy(() => import('@/components/domain/manage/user/users-list'));

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/users/')({
    validateSearch: z.object({
        users_page: z.coerce.number().optional(),
        users_pagesize: z.coerce.number().optional(),
        users_search: z.string().optional(),
    }),
    component: UsersList,
});
