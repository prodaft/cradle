import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
    return createRouter({
        routeTree,
        defaultPreload: 'intent',
        scrollRestoration: true,
    });
}

const router = getRouter();

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
