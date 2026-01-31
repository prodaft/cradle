import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/users' as any,
)({
    staticData: {
        breadcrumb: 'Users',
    },
    component: () => <Outlet />,
});
