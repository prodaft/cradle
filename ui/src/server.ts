import * as Sentry from '@sentry/tanstackstart-react';
import type { Register } from '@tanstack/react-router';
import type { RequestHandler } from '@tanstack/react-start/server';
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

const serverDsn = process.env.SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;
if (serverDsn) {
    Sentry.init({
        dsn: serverDsn,
        environment: process.env.NODE_ENV ?? 'development',
        sendDefaultPii: true,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
}

export default createServerEntry(
    Sentry.wrapFetchWithSentry({
        fetch(request, opts) {
            return handler.fetch(
                request,
                opts as Parameters<RequestHandler<Register>>[1],
            );
        },
    }),
);
