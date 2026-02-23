import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const ConfirmEmail = lazy(() => import('@/components/domain/auth/confirm-email'));

export const Route = createFileRoute('/confirm-email')({
    validateSearch: z.object({
        token: z.string().optional(),
    }),
    component: ConfirmEmail,
});
