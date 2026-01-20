import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Suspense } from 'react';
import Loading from 'src/components/base/Loading/Loading';
import { AuthProvider } from 'src/components/domain/auth/AuthProvider';
import { Toaster } from 'src/components/ui/sonner';
import { TooltipProvider } from 'src/components/ui/tooltip';
import { ApiProvider } from 'src/contexts/api/ApiProvider';
import { QueryProvider } from 'src/contexts/query/QueryProvider';
import { ThemeProvider } from '@/contexts/ui';

export const Route = createRootRoute({
    component: () => {
        return (
            <AuthProvider>
                <QueryProvider>
                    <ApiProvider>
                        <ThemeProvider>
                            <Toaster />
                            <TooltipProvider>
                                <div id='root-content'>
                                    <Suspense fallback={<Loading logo={true} />}>
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
        );
    },
});
