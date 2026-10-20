import MainLayout from '@/components/layout/main-layout/main-layout';
import { isSessionLoggedIn } from '@services/openapi/client-auth';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
    beforeLoad: ({ location }) => {
        if (!isSessionLoggedIn()) {
            throw redirect({
                to: '/login',
                state: {
                    from: location.href,
                },
                replace: true,
            });
        }
    },
    component: MainLayout,
});
