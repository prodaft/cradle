import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/manage/')({
    beforeLoad: () => {
        throw redirect({
            to: '/manage/entry-types',
            replace: true,
        });
    },
});
