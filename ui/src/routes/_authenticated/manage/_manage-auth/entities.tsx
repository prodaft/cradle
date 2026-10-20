import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/entities')({
    staticData: {
        breadcrumb: 'Entities',
    },
    component: () => <Outlet />,
});
