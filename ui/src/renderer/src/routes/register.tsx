import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const Register = lazy(() => import('@/components/domain/auth/Register'));

export const Route = createFileRoute('/register')({
    component: Register,
});
