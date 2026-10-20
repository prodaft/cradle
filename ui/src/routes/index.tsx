import { isSessionLoggedIn } from '@services/openapi/client-auth';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        if (!isSessionLoggedIn()) {
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
