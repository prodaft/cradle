import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const ForgotPassword = lazy(() => import('@/components/domain/auth/forgot-password'));

export const Route = createFileRoute('/_auth/forgot-password')({
    component: ForgotPassword,
});
