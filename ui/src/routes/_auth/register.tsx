import { createLoaderApis } from '@/utils/apiLoader';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Register = lazy(() => import('@/components/domain/auth/register'));

export const Route = createFileRoute('/_auth/register')({
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
