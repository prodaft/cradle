import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const Login = lazy(() => import('src/components/domain/auth/Login'));

export const Route = createFileRoute('/login')({
    component: Login,
});
