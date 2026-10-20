import { fetchClient } from '@services/openapi/client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Signup = lazy(() => import('@/components/domain/auth/signup'));

export const Route = createFileRoute('/_auth/signup')({
    beforeLoad: async () => {
        let userConfig: Record<string, unknown> | null = null;
        try {
            const { data, error } = await fetchClient.GET('/auth/config/');
            if (!error && data) userConfig = data as Record<string, unknown>;
        } catch {
            /* config fetch failed */
        }

        const signupEnabled =
            userConfig &&
            ((userConfig.signup as boolean | undefined) ??
                (userConfig.registration_enabled as boolean | undefined));

        if (signupEnabled === false) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }
        if (!userConfig) {
            throw redirect({
                to: '/login',
                replace: true,
            });
        }
    },
    component: Signup,
});
