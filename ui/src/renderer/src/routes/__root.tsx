import CradleLoading from '@/components/base/Loading/CradleLoading';
import { AuthProvider } from '@/components/domain/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiProvider } from '@/contexts/api/ApiProvider';
import { QueryProvider } from '@/contexts/query/QueryProvider';
import { ThemeProvider } from '@/contexts/ui/ThemeContext';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Suspense } from 'react';

export const Route = createRootRoute({
    component: () => (
        <AuthProvider>
            <QueryProvider>
                <ApiProvider>
                    <ThemeProvider>
                        <Toaster />
                        <TooltipProvider>
                            <div id='root-content'>
                                <Suspense fallback={<CradleLoading />}>
                                    <Outlet />
                                </Suspense>
                            </div>
                            <div id='portal-root'></div>
                        </TooltipProvider>
                    </ThemeProvider>
                </ApiProvider>
            </QueryProvider>

            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </AuthProvider>
    ),
});
