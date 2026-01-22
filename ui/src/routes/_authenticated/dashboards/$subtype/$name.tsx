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

        if (!subtype || !name) {
            throw notFound();
        }

        const { queryApi } = createLoaderApis();

        try {
            const response = await queryApi.queryList({
                subtype: [subtype],
                nameExact: [name],
            });

            if (response.count !== 1) {
                throw notFound();
            }

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
                throw notFound();
            }
            // For API errors or other issues, show 404 page
            throw notFound();
        }
    },
    component: Dashboard,
});
