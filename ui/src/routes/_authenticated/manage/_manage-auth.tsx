import { canOpenManagePath } from '@/utils/auth';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

/**
 * Single pathless layout for manage: admin for users/settings, open team and entity settings
 * pages (for team leads), manager for the rest.
 */
export const Route = createFileRoute('/_authenticated/manage/_manage-auth')({
    beforeLoad: ({ location }) => {
        if (!canOpenManagePath(location.pathname)) throw notFound();
    },
    component: () => <Outlet />,
});
