import { createFileRoute, redirect } from '@tanstack/react-router';
import MainLayout from '@/components/layout/main-layout/MainLayout';
import { isLoggedIn } from 'src/utils/auth';

export const Route = createFileRoute('/_authenticated')({
    beforeLoad: ({ location }) => {
        if (!isLoggedIn()) {
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
