import { validateSearchSchema } from '@/components/domain/reports/reports-list-search-schema';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const ReportsList = lazy(() => import('@/components/domain/reports/reports-list'));

export const Route = createFileRoute('/_authenticated/reports')({
    staticData: {
        breadcrumb: 'Reports',
    },
    validateSearch: validateSearchSchema,
    component: ReportsList,
});
