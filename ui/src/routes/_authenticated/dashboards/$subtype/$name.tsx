import { PageLoader } from '@/components/base/page-loader';
import Dashboard from '@/components/domain/dashboard/dashboard';
import type { ApiQuery } from '@services/openapi/api-query';
import { fetchClient } from '@services/openapi/client';
import { createFileRoute, notFound } from '@tanstack/react-router';
import * as z from 'zod';

export const Route = createFileRoute('/_authenticated/dashboards/$subtype/$name')({
    staticData: {
        breadcrumb: (match: any) => match.params.name || 'Dashboard',
    },
    validateSearch: z.looseObject({
        heading: z.string().optional(),
        tab: z
            .enum(['notes', 'relations', 'files', 'enrichment', 'eventlog'])
            .optional(),
    }),
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60,
    pendingComponent: () => <PageLoader fill='container' />,
    loader: async ({ params }) => {
        const { subtype, name } = params;

        if (!subtype || !name) {
            throw notFound();
        }

        try {
            const { data, error } = await fetchClient.GET('/query/', {
                params: {
                    query: {
                        subtype,
                        name_exact: name,
                    } satisfies ApiQuery<'query_list'>,
                },
            });

            if (error || !data || data.count !== 1) {
                throw notFound();
            }

            return {
                entry: data.results[0]!,
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
