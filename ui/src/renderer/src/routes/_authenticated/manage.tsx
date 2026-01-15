import { createFileRoute, Outlet } from '@tanstack/react-router';

/**
 * Base layout route for /manage
 * Permission checks are handled by child layout routes:
 * - _entry-manager.tsx - for entry manager accessible routes
 * - _admin.tsx - for admin-only routes
 */
export const Route = createFileRoute('/_authenticated/manage')({
    component: () => <Outlet />,
});
