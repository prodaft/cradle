import { fetchClient } from '@services/openapi/client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Register = lazy(() => import('@/components/domain/auth/register'));

export const Route = createFileRoute('/_auth/register')({
    beforeLoad: async () => {
        let userConfig;
        try {
            const { data, error } = await fetchClient.GET('/users/config/');
            if (error || !data) return;
            userConfig = data as Record<string, unknown>;
        } catch {
            return;
        }

        const signupEnabled =
            (userConfig.signup as boolean | undefined) ??
            (userConfig.registration_enabled as boolean | undefined);

        if (signupEnabled === false) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }
    },
    component: Register,
});
