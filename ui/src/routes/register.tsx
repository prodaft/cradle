import { createLoaderApis } from 'src/utils/apiLoader';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Register = lazy(() => import('src/components/domain/auth/Register'));

export const Route = createFileRoute('/register')({
    beforeLoad: async () => {
        const { usersApi } = createLoaderApis();

        let userConfig;
        try {
            userConfig = await usersApi.usersConfig();
        } catch (error) {
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
