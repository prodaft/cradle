import { isAdmin, isEntryManager } from '@/utils/auth';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

const ADMIN_PATHS = ['/manage/users', '/manage/settings'];

/**
 * Single pathless layout for manage: enforces admin for users/settings, entry-manager for the rest.
 */
export const Route = createFileRoute('/_authenticated/manage/_manage-auth')({
    beforeLoad: ({ location }) => {
        const path = location.pathname;
        const isAdminRoute = ADMIN_PATHS.some((p) => path.startsWith(p));
        if (isAdminRoute) {
            if (!isAdmin()) throw notFound();
        } else {
            if (!isEntryManager()) throw notFound();
        }
    },
    component: () => <Outlet />,
});
