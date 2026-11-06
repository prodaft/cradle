import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/manage/_manage-auth/entry-types')(
    {
        staticData: {
            breadcrumb: 'Entry Types',
        },
        component: () => <Outlet />,
    },
);
