import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const OAuthCallback = lazy(() => import('src/components/domain/auth/OAuthCallback'));

export const Route = createFileRoute('/oauth/callback')({
    component: OAuthCallback,
});
