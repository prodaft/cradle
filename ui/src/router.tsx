import * as Sentry from '@sentry/tanstackstart-react';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
    const router = createRouter({
        routeTree,
        defaultPreload: false,
        scrollRestoration: true,
    });

    if (!router.isServer) {
        const dsn = import.meta.env.VITE_SENTRY_DSN;
        if (dsn) {
            Sentry.init({
                dsn,
                environment: import.meta.env.MODE,
                sendDefaultPii: true,
                integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
                tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
            });
        }
    }

    return router;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
