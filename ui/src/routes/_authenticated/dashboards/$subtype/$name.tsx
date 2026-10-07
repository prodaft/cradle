import { PageLoader } from '@/components/base/page-loader';
import Dashboard from '@/components/domain/dashboard/dashboard';
import { dashboardValidateSearchSchema } from '@/components/domain/notes/notes-list-search-schema';
import NotFound from '@/components/feedback/not-found';
import { FILE_DASHBOARD_SUBTYPE } from '@/utils/dashboard';
import { fetchClient } from '@services/openapi/client';
import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/dashboards/$subtype/$name')({
    staticData: {
        breadcrumb: (match: any) =>
            match.params.subtype === FILE_DASHBOARD_SUBTYPE
                ? 'File'
                : match.params.name || 'Dashboard',
    },
    validateSearch: dashboardValidateSearchSchema,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60,
    pendingComponent: () => <PageLoader fill='container' />,
    notFoundComponent: () => (
        <NotFound message='The entry you are looking for does not exist.' />
    ),
    loader: async ({ params }) => {
        const { subtype, name } = params;

        if (!subtype || !name) {
            throw notFound();
        }
        if (subtype === FILE_DASHBOARD_SUBTYPE) {
            return { entry: null };
        }

        try {
            const { data, error } = await fetchClient.GET('/query/', {
                params: {
                    query: {
                        subtype,
                        name_exact: name,
                    },
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
