import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const Login = lazy(() => import('@/components/domain/auth/Login'));

export const Route = createFileRoute('/login')({
    validateSearch: z.object({
        from: z.string().optional(),
    }),
    component: Login,
});
