import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { lazy } from 'react';

const Signup = lazy(() => import('@/components/domain/auth/signup'));

export const Route = createFileRoute('/_auth/signup')({
    beforeLoad: async () => {
        let userConfig: components['schemas']['UserConfig'] | null = null;
        try {
            const { data, error } = await fetchClient.GET('/auth/config/');
            if (!error && data) userConfig = data;
        } catch {
            /* config fetch failed */
        }

        const signupEnabled = userConfig && userConfig.signup;

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
