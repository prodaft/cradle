import { createFileRoute, notFound } from '@tanstack/react-router';
import { lazy } from 'react';
import type { EntryResponse } from 'src/services/cradle/models';
import { createLoaderApis } from 'src/utils/apiLoader';
import { z } from 'zod';

const Dashboard = lazy(() => import('src/components/domain/dashboard/Dashboard'));

export const Route = createFileRoute('/_authenticated/dashboards/$subtype/$name')({
    validateSearch: z.object({
        heading: z.string().optional(),
        tab: z.enum(['notes', 'relations', 'files', 'eventlog']).optional(),
    }),
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
