import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const Login = lazy(() => import('@/components/domain/auth/login'));

export const Route = createFileRoute('/_auth/login')({
    validateSearch: z.object({
        from: z.string().optional(),
    }),
    component: Login,
});
