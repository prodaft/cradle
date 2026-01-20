import { isAdmin } from '@/utils/auth';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

/**
 * Layout route for admin-only pages
 * All routes under this will require admin role
 * The (admin) route group doesn't affect the URL path
 */
export const Route = createFileRoute('/_authenticated/manage/(admin)' as any)({
    beforeLoad: () => {
        if (!isAdmin()) {
            throw notFound();
        }
    },
    component: () => <Outlet />,
});
