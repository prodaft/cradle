import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const AccountSettings = lazy(
    () => import('src/components/domain/user/AccountSettings'),
);

export const Route = createFileRoute('/_authenticated/settings')({
    staticData: {
        breadcrumb: 'Settings',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
        sessions_page: z.coerce.number().optional(),
        sessions_pagesize: z.coerce.number().optional(),
    }),
    component: () => <AccountSettings target='me' />,
});
