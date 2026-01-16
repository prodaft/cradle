import { createBrowserHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create browser history for client-side routing
const browserHistory = createBrowserHistory();

// Create a new router instance
export const router = createRouter({
    routeTree,
    history: browserHistory,
    defaultPreload: 'intent',
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
