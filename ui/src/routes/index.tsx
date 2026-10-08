import { createFileRoute, redirect } from '@tanstack/react-router';
import { isLoggedIn } from 'src/utils/auth';

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        if (!isLoggedIn()) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }

        throw redirect({
            to: '/notes',
            replace: true,
        });
    },
});
