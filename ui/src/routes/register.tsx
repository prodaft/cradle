import { createLoaderApis } from '@/utils/apiLoader';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Register = lazy(() => import('@/components/domain/auth/Register'));

export const Route = createFileRoute('/register')({
    beforeLoad: async () => {
        const { usersApi } = createLoaderApis();

        let userConfig;
        try {
            userConfig = await usersApi.usersConfig();
        } catch {
            return;
        }

        if (userConfig.signup === false) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }
    },
    component: Register,
});
