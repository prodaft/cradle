import { ThemeProvider } from '@/contexts/ui';
import * as Sentry from '@sentry/react';
import '@styles/main.css';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/themes/prism-tomorrow.css';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import Loading from 'src/components/base/Loading/Loading';
import { AuthProvider } from 'src/components/domain/auth/AuthProvider';
import { Toaster } from 'src/components/ui/sonner';
import { TooltipProvider } from 'src/components/ui/tooltip';
import { ApiProvider } from '@/contexts/api/api-provider';
import { QueryProvider } from '@/contexts/query/query-provider';

export const Route = createRootRoute({
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
    useEffect(() => {
        const dsn = import.meta.env.VITE_SENTRY_DSN;
        if (dsn) Sentry.init({ dsn });
    }, []);

    return (
        <RootDocument>
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
                                <div id='portal-root' />
                            </TooltipProvider>
                        </ThemeProvider>
                    </ApiProvider>
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
            <body className='h-screen w-screen p-0 m-0 overflow-hidden overflow-y-hidden'>
                {children}
                <Scripts />
            </body>
        </html>
    );
}
