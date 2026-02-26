import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { createFileRoute, notFound } from '@tanstack/react-router';
import Dashboard from 'src/components/domain/dashboard/dashboard';
import * as z from 'zod';

type EntryResponse = components['schemas']['EntryResponse'];

export const Route = createFileRoute('/_authenticated/dashboards/$subtype/$name')({
    staticData: {
        breadcrumb: (match: any) => match.params.name || 'Dashboard',
    },
    validateSearch: z.object({
        heading: z.string().optional(),
        tab: z
            .enum(['notes', 'relations', 'files', 'enrichment', 'eventlog'])
            .optional(),
    }),
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60,
    pendingComponent: () => <div>Loading dashboard...</div>,
    loader: async ({ params }) => {
        const { subtype, name } = params;

        if (!subtype || !name) {
            throw notFound();
        }

        try {
            const { data, error } = await fetchClient.GET('/query/', {
                params: {
                    query: {
                        subtype: [subtype],
                        name_exact: [name],
                    },
                },
            });

            if (error || !data || data.count !== 1) {
                throw notFound();
            }

            return {
                entry: data.results[0] as EntryResponse,
            };
        } catch (error) {
            if (
                error &&
                typeof error === 'object' &&
                'statusCode' in error &&
                error.statusCode === 404
            ) {
                throw notFound();
            }
            throw notFound();
        }
    },
    component: Dashboard,
});
