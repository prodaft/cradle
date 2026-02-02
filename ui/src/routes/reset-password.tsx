import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const ResetPassword = lazy(() => import('@/components/domain/auth/ResetPassword'));

export const Route = createFileRoute('/reset-password')({
    validateSearch: z.object({
        token: z.string().optional(),
    }),
    component: ResetPassword,
});
