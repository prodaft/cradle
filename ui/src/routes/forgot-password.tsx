import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const ForgotPassword = lazy(() => import('src/components/domain/auth/ForgotPassword'));

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPassword,
});
