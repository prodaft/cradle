import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute(
    '/_authenticated/manage/_manage-auth/entities' as any,
)({
    staticData: {
        breadcrumb: 'Entities',
    },
    component: () => <Outlet />,
});
