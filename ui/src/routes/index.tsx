import { isLoggedIn } from 'src/utils/auth';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        if (!isLoggedIn()) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }

        throw redirect({
            to: '/_authenticated',
            replace: true,
        });
    },
});
