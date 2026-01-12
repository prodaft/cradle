import { createHashHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create hash history for Electron compatibility
const hashHistory = createHashHistory();

// Create a new router instance
export const router = createRouter({
    routeTree,
    history: hashHistory,
    defaultPreload: 'intent',
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
