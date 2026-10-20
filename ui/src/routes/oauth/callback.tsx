import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const OAuthCallback = lazy(() => import('@/components/domain/auth/oauth-callback'));

export const Route = createFileRoute('/oauth/callback')({
    component: OAuthCallback,
});
