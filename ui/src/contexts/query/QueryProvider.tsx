/**
 * QueryProvider - Provides TanStack Query QueryClient to the application
 * Thin wrapper that mounts QueryClientProvider and wires session expiration handler
 */

import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryClient, setSessionExpiredHandler } from '@/query/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRouter } from '@tanstack/react-router';
import { ReactNode, useEffect } from 'react';

interface QueryProviderProps {
    children: ReactNode;
}

/**
 * QueryProvider component
 *
 * Must be rendered under TanStack Router's <RouterProvider> (uses useRouter()),
 * and should wrap providers/components that use React Query hooks (useQueryClient, useQuery, etc.).
 */
export function QueryProvider({ children }: QueryProviderProps) {
    const router = useRouter();
    const { logOut } = useAuthActions();

    useEffect(() => {
        setSessionExpiredHandler(() => {
            // Clear auth tokens to prevent redirect loops
            logOut();
            // Navigate to login with current location for post-login redirect
            router.navigate({
                to: '/login',
                state: { from: router.state.location.href },
            });
        });
    }, [router, logOut]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}
