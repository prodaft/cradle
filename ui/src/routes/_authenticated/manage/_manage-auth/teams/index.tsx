import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const TeamsList = lazy(() => import('@/components/domain/manage/team/teams-list'));

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/teams/')({
    validateSearch: z.object({
        teams_page: z.coerce.number().optional(),
        teams_pagesize: z.coerce.number().optional(),
        teams_search: z.string().optional(),
    }),
    component: TeamsList,
});
