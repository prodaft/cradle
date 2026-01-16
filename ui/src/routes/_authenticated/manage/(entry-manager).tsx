import { isEntryManager } from '@/utils/auth';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

/**
 * Layout route for entry manager-only pages
 * All routes under this will require entry manager or admin role
 * The (entry-manager) route group doesn't affect the URL path
 */
export const Route = createFileRoute('/_authenticated/manage/(entry-manager)' as any)({
    beforeLoad: () => {
        if (!isEntryManager()) {
            throw notFound();
        }
    },
    component: () => <Outlet />,
});
