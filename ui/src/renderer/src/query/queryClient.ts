/**
 * Centralized QueryClient configuration
 * All cross-cutting behavior lives here: toasts, session-expired, invalidation
 */

import { SessionExpiredException } from '@/exceptions/AuthExceptions';
import { handleAPIError, parseAPIError } from '@/utils/api';
import {
    MutationCache,
    QueryCache,
    QueryClient,
    QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';

export type InvalidateTarget = { queryKey: QueryKey };

type AppMeta = {
    // queries
    showErrorToast?: boolean;

    // mutations
    successMessage?: string;
    errorMessage?: string;
    suppressNotification?: boolean;
    invalidateQueries?: InvalidateTarget[];

    // shared
    duration?: number;
};

let sessionExpiredHandler: null | (() => void) = null;
let sessionExpiredGateUntil = 0;

export function setSessionExpiredHandler(fn: () => void) {
    sessionExpiredHandler = fn;
}

function triggerSessionExpiredOnce() {
    const now = Date.now();
    if (now < sessionExpiredGateUntil) return;
    sessionExpiredGateUntil = now + 5000; // 5s gate

    toast.error('Authentication failed. Please log in again.', { duration: 3000 });
    sessionExpiredHandler?.();
}

function isAbortError(err: unknown) {
    return err instanceof DOMException && err.name === 'AbortError';
}

async function handleErrorCommon(error: unknown) {
    // your existing special-case
    if (error instanceof SessionExpiredException) {
        triggerSessionExpiredOnce();
        return { kind: 'sessionExpired' as const };
    }

    const parsed = await parseAPIError(error);
    const ignore =
        parsed.code === 'UNAUTHENTICATED' || parsed.code === 'SESSION_EXPIRED';
    return { kind: 'parsed' as const, parsed, ignore };
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
            throwOnError: false,
        },
        mutations: {
            retry: 1,
            throwOnError: false,
        },
    },

    queryCache: new QueryCache({
        onError: (error, query) => {
            if (isAbortError(error)) return;

            const meta = (query.meta ?? {}) as AppMeta;

            void (async () => {
                const res = await handleErrorCommon(error);
                if (res.kind === 'sessionExpired') return;
                if (res.ignore) return;

                // Queries: opt-in toast (prevents refetch spam)
                if (meta.showErrorToast && !meta.suppressNotification) {
                    toast.error(meta.errorMessage ?? res.parsed.detail, {
                        duration: meta.duration ?? 5000,
                    });
                } else {
                    // optional: still log/track silently, or do nothing
                }
            })();
        },
    }),

    mutationCache: new MutationCache({
        onSuccess: (_data, _variables, _ctx, mutation) => {
            const meta = (mutation.meta ?? {}) as AppMeta;

            if (meta.successMessage) {
                toast.success(meta.successMessage, { duration: meta.duration ?? 3500 });
            }

            meta.invalidateQueries?.forEach((t) => {
                queryClient.invalidateQueries({ queryKey: t.queryKey });
            });
        },

        onError: (error, _variables, _ctx, mutation) => {
            if (isAbortError(error)) return;

            const meta = (mutation.meta ?? {}) as AppMeta;

            void (async () => {
                const res = await handleErrorCommon(error);
                if (res.kind === 'sessionExpired') return;
                if (res.ignore) return;

                if (!meta.suppressNotification) {
                    // Mutations: toast by default
                    toast.error(meta.errorMessage ?? res.parsed.detail, {
                        duration: meta.duration ?? 5000,
                    });
                } else {
                    // if suppressed, still allow centralized reporting
                    handleAPIError(res.parsed, {
                        message: res.parsed.detail,
                        duration: 5000,
                    });
                }
            })();
        },
    }),
});
