import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const AccountSettings = lazy(() => import('@/components/domain/user/AccountSettings'));

export const Route = createFileRoute('/_authenticated/settings')({
    validateSearch: z.object({
        tab: z.string().optional(),
        sessions_page: z.coerce.number().optional(),
        sessions_pagesize: z.coerce.number().optional(),
    }),
    component: () => <AccountSettings target='me' />,
});
