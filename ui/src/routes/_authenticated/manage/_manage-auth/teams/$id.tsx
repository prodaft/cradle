import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const TeamSettingsPage = lazy(
    () => import('@/components/domain/manage/team/team-settings-page'),
);

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/teams/$id')({
    staticData: {
        breadcrumb: 'Team Details',
    },
    validateSearch: z.object({
        tab: z.string().optional(),
    }),
    component: TeamSettingsPage,
});
