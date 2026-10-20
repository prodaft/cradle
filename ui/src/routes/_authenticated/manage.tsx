import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * Base layout route for /manage
 * Permission checks are handled by the _manage-auth.tsx layout route:
 * admin-only for users/settings, manager (or admin) for the rest.
 */
export const Route = createFileRoute('/_authenticated/manage')({
    staticData: {
        breadcrumb: 'Manage',
    },
    component: () => <Outlet />,
});
