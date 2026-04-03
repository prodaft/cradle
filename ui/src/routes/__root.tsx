import { PageLoader } from '@/components/base/page-loader';
import { QueryProvider } from '@/contexts/query/query-provider';
import { ThemeProvider } from '@/contexts/ui';
import '@styles/main.css';
import * as Sentry from '@sentry/tanstackstart-react';
import {
    createRootRoute,
    HeadContent,
    Outlet,
    Scripts,
    type ErrorComponentProps,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Suspense, useEffect, type ReactNode } from 'react';
import { AuthProvider } from 'src/components/domain/auth/auth-provider';
import { Toaster } from 'src/components/ui/sonner';
import { TooltipProvider } from 'src/components/ui/tooltip';

function RootErrorComponent({ error }: ErrorComponentProps) {
    useEffect(() => {
        if (!import.meta.env.VITE_SENTRY_DSN) return;
        Sentry.captureException(error);
    }, [error]);
    return (
        <div className='flex h-full w-full items-center justify-center p-6 text-sm text-destructive' role='alert'>
            Something went wrong. Please refresh the page or try again later.
        </div>
    );
}

export const Route = createRootRoute({
    errorComponent: RootErrorComponent,
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1.0',
            },
            {
                name: 'Content-Security-Policy',
                content:
                    "default-src *; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; img-src 'self' data: *;",
            },
            { title: 'CRADLE' },
        ],
        links: [
            {
                rel: 'icon',
                type: 'image/svg+xml',
                href: '/favicon-light.svg',
                media: '(prefers-color-scheme: dark)',
            },
            {
                rel: 'icon',
                type: 'image/svg+xml',
                href: '/favicon-dark.svg',
                media: '(prefers-color-scheme: light)',
            },
        ],
    }),
    component: RootComponent,
});

function RootComponent() {
    return (
        <RootDocument>
            <AuthProvider>
                <QueryProvider>
                    <ThemeProvider>
                        <Toaster />
                        <TooltipProvider>
                            <div id='root-content'>
                                <Suspense fallback={<PageLoader fill='screen' logo />}>
                                    <Outlet />
                                </Suspense>
                            </div>
                            <div id='portal-root' />
                        </TooltipProvider>
                    </ThemeProvider>
                </QueryProvider>
                {import.meta.env.DEV && <TanStackRouterDevtools />}
            </AuthProvider>
        </RootDocument>
    );
}

function RootDocument({ children }: { children: ReactNode }) {
    return (
        <html data-theme='light' lang='en'>
            <head>
                <HeadContent />
            </head>
            <body className='h-screen w-screen p-0 m-0 overflow-hidden'>
                {children}
                <Scripts />
            </body>
        </html>
    );
}
