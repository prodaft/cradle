import { createFileRoute, notFound } from '@tanstack/react-router';
import type { EntryResponse } from 'src/services/cradle/models';
import { createLoaderApis } from 'src/utils/apiLoader';
import { z } from 'zod';
import Dashboard from 'src/components/domain/dashboard/Dashboard';

export const Route = createFileRoute('/_authenticated/dashboards/$subtype/$name')({
    staticData: {
        breadcrumb: (match: any) => match.params.name || 'Dashboard',
    },
    validateSearch: z.object({
        heading: z.string().optional(),
        tab: z.enum(['notes', 'relations', 'files', 'enrichment', 'eventlog']).optional(),
    }),
    // Add cache configuration to prevent unnecessary refetches
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    staleTime: 1000 * 60, // Consider fresh for 1 minute
    // Add pending component to show during navigation
    pendingComponent: () => <div>Loading dashboard...</div>,
    loader: async ({ params }) => {
        const { subtype, name } = params;

        console.log('[Dashboard Loader] Called with params:', { subtype, name });

        if (!subtype || !name) {
            console.error('[Dashboard Loader] Missing params');
            throw notFound();
        }

        const { queryApi } = createLoaderApis();

        try {
            console.log('[Dashboard Loader] Fetching entry...');
            const response = await queryApi.queryList({
                subtype: [subtype],
                nameExact: [name],
            });
            console.log('[Dashboard Loader] API response:', { count: response.count, results: response.results?.length });

            if (response.count !== 1) {
                console.error('[Dashboard Loader] Expected 1 result, got:', response.count);
                throw notFound();
            }

            console.log('[Dashboard Loader] Success, returning entry');
            return {
                entry: response.results[0] as EntryResponse,
            };
        } catch (error) {
            // Re-throw notFound errors, convert other errors to notFound
            if (
                error &&
                typeof error === 'object' &&
                'statusCode' in error &&
                error.statusCode === 404
            ) {
                console.error('[Dashboard Loader] 404 error from API');
                throw notFound();
            }
            // Log the actual error for debugging
            console.error('[Dashboard Loader] Unexpected error:', error);
            // For API errors or other issues, show 404 page
            throw notFound();
        }
    },
    component: Dashboard,
});
