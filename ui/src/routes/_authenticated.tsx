import { createFileRoute, redirect } from '@tanstack/react-router';
import MainLayout from 'src/components/layout/MainLayout/MainLayout';
import { isLoggedIn } from 'src/utils/auth';

export const Route = createFileRoute('/_authenticated')({
    beforeLoad: ({ location }) => {
        if (!isLoggedIn()) {
            throw redirect({
                to: '/login',
                search: {
                    from: location.href,
                },
                replace: true,
            });
        }
    },
    component: MainLayout,
});
