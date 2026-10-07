import { validateSearchSchema } from '@/components/domain/files/files-list-search-schema';
import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const FilesList = lazy(() => import('@/components/domain/files/files-list'));

export const Route = createFileRoute('/_authenticated/files')({
    staticData: {
        breadcrumb: 'Files',
    },
    validateSearch: validateSearchSchema,
    component: FilesList,
});
