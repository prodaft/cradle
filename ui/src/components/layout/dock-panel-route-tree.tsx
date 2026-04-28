import { PageLoader } from '@/components/base/page-loader';
import Dashboard from '@/components/domain/dashboard/dashboard';
import KnowledgeGraphSearch from '@/components/domain/graph/knowledge-graph-search';
import NotFound from '@/components/feedback/not-found';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { fetchClient } from '@/services/openapi/client';
import { isAdmin, isEntryManager } from '@/utils/auth';
import {
    createRootRoute,
    createRoute,
    notFound,
    Outlet,
    redirect,
} from '@tanstack/react-router';
import { lazy } from 'react';
import * as z from 'zod';

const AccountSettings = lazy(
    () => import('@/components/domain/user/account-settings-page'),
);
const DigestData = lazy(() => import('@/components/domain/digests/digest-data'));
const EnrichmentLayout = lazy(
    () => import('@/components/domain/enrichment/enrichment-layout'),
);
const EnrichmentRequests = lazy(
    () => import('@/components/domain/enrichment/enrichment-requests'),
);
const EnrichmentResults = lazy(
    () => import('@/components/domain/enrichment/enrichment-results'),
);
const FilesList = lazy(() => import('@/components/domain/files/files-list'));
const GraphExplorer = lazy(() => import('@/components/domain/graph/graph-explorer'));
const NotesLayout = lazy(() => import('@/components/domain/notes/notes-layout'));
const NotesListPage = lazy(() => import('@/components/domain/notes/notes-list-page'));
const NoteViewer = lazy(() => import('@/components/domain/notes/note-viewer'));
const Reports = lazy(() => import('@/components/domain/reports/report-list'));

const EnrichmentPage = lazy(
    () => import('@/components/domain/admin/enrichment/enrichment-page'),
);
const EntitiesPage = lazy(
    () => import('@/components/domain/admin/entity/entities-page'),
);
const EntitySettingsPage = lazy(
    () => import('@/components/domain/admin/entity/entity-settings-page'),
);
const EntryTypesPage = lazy(
    () => import('@/components/domain/admin/entry-type/entry-types-page'),
);
const EntryTypeSettingsPage = lazy(
    () => import('@/components/domain/admin/entry-type/entry-type-settings-page'),
);
const SettingsPage = lazy(
    () => import('@/components/domain/admin/settings/admin-settings-page'),
);
const TypeMappingsPage = lazy(
    () => import('@/components/domain/admin/type-mappings/type-mappings-page'),
);
const UsersPage = lazy(() => import('@/components/domain/admin/user/users-page'));
const UserSettingsPage = lazy(
    () => import('@/components/domain/admin/user/user-settings-page'),
);

const tabSearch = z.object({
    tab: z.string().optional(),
});

const notesSearch = z.object({
    notes_page: z.coerce.number().optional(),
    notes_sort_field: z.string().optional(),
    notes_sort_direction: z.enum(['asc', 'desc']).optional(),
    notes_pagesize: z.coerce.number().optional(),
    content: z.string().optional(),
    author__username: z.string().optional(),
    editor__username: z.string().optional(),
    created_date_from: z.string().optional(),
    created_date_to: z.string().optional(),
    updated_date_from: z.string().optional(),
    updated_date_to: z.string().optional(),
});

const noteSearch = z.object({
    heading: z.string().optional(),
    view: z.enum(['content', 'graph', 'history', 'files']).optional(),
    source: z.boolean().optional(),
});

const dashboardSearch = z.object({
    heading: z.string().optional(),
    tab: z.enum(['notes', 'relations', 'files', 'enrichment', 'eventlog']).optional(),
});

const reportsSearch = z.object({
    reports_page: z.coerce.number().optional(),
    reports_sort_field: z.string().optional(),
    reports_sort_direction: z.enum(['asc', 'desc']).optional(),
    reports_pagesize: z.coerce.number().optional(),
});

const filesSearch = z.object({
    files_page: z.coerce.number().optional(),
    files_sort_field: z.string().optional(),
    files_sort_direction: z.enum(['asc', 'desc']).optional(),
    files_pagesize: z.coerce.number().optional(),
});

const digestDataSearch = z.object({
    digests_sort_field: z.string().optional(),
    digests_sort_direction: z.enum(['asc', 'desc']).optional(),
    digests_pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    created_at_gte: z.string().optional(),
    created_at_lte: z.string().optional(),
    status: z.string().optional(),
});

const accountSettingsSearch = z.object({
    tab: z.string().optional(),
    sessions_page: z.coerce.number().optional(),
    sessions_pagesize: z.coerce.number().optional(),
});

const enrichmentRequestsSearch = z.object({
    sort_field: z.string().optional(),
    sort_direction: z.enum(['asc', 'desc']).optional(),
    pagesize: z.coerce.number().optional(),
    title: z.string().optional(),
    user__username: z.string().optional(),
    status: z.string().optional(),
});

const usersSearch = z.object({
    users_page: z.coerce.number().optional(),
    users_pagesize: z.coerce.number().optional(),
    users_search: z.string().optional(),
});

const entitiesSearch = z.object({
    entities_page: z.coerce.number().optional(),
    entities_pagesize: z.coerce.number().optional(),
    entities_search: z.string().optional(),
});

const entryTypesSearch = z.object({
    entry_types_page: z.coerce.number().optional(),
    entry_types_pagesize: z.coerce.number().optional(),
    entry_types_search: z.string().optional(),
});

const rootRoute = createRootRoute({
    component: Outlet,
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
        throw redirect({ to: '/notes', replace: true });
    },
});

const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_authenticated',
    component: Outlet,
});

const notesRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'notes',
    validateSearch: notesSearch,
    component: NotesLayout,
});

const notesIndexRoute = createRoute({
    getParentRoute: () => notesRoute,
    path: '/',
    component: NotesListPage,
});

const noteRoute = createRoute({
    getParentRoute: () => notesRoute,
    path: '$id',
    validateSearch: noteSearch,
    component: NoteViewer,
});

const reportsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'reports',
    validateSearch: reportsSearch,
    component: Reports,
});

const filesRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'files',
    validateSearch: filesSearch,
    component: FilesList,
});

const digestDataRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'digest-data',
    validateSearch: digestDataSearch,
    component: DigestData,
});

const settingsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'settings',
    validateSearch: accountSettingsSearch,
    component: () => <AccountSettings target='me' />,
});

function KnowledgeGraphPage() {
    useDockPanelTab({ title: 'Knowledge graph', icon: 'knowledge-graph' });
    return <GraphExplorer GraphSearchComponent={KnowledgeGraphSearch} />;
}

const knowledgeGraphRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'knowledge-graph',
    component: KnowledgeGraphPage,
});

const enrichmentRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'enrichment',
    component: EnrichmentLayout,
});

const enrichmentIndexRoute = createRoute({
    getParentRoute: () => enrichmentRoute,
    path: '/',
    validateSearch: enrichmentRequestsSearch,
    component: EnrichmentRequests,
});

const enrichmentResultRoute = createRoute({
    getParentRoute: () => enrichmentRoute,
    path: '$id',
    component: EnrichmentResults,
});

const dashboardRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'dashboards/$subtype/$name',
    validateSearch: dashboardSearch,
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
                    },
                },
            });

            if (error || !data || data.count !== 1) {
                throw notFound();
            }

            return { entry: data.results[0]! };
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

const manageRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'manage',
    component: Outlet,
});

const manageIndexRoute = createRoute({
    getParentRoute: () => manageRoute,
    path: '/',
    beforeLoad: () => {
        throw redirect({
            to: '/manage/entities',
            replace: true,
        });
    },
});

const ADMIN_PATHS = ['/manage/users', '/manage/settings'];

const manageAuthRoute = createRoute({
    getParentRoute: () => manageRoute,
    id: '_manage-auth',
    beforeLoad: ({ location }) => {
        const path = location.pathname;
        const isAdminRoute = ADMIN_PATHS.some((p) => path.startsWith(p));
        if (isAdminRoute) {
            if (!isAdmin()) throw notFound();
        } else if (!isEntryManager()) {
            throw notFound();
        }
    },
    component: Outlet,
});

const usersRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'users',
    component: Outlet,
});

const usersIndexRoute = createRoute({
    getParentRoute: () => usersRoute,
    path: '/',
    validateSearch: usersSearch,
    component: UsersPage,
});

const userRoute = createRoute({
    getParentRoute: () => usersRoute,
    path: '$id',
    validateSearch: tabSearch,
    component: UserSettingsPage,
});

const entitiesRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'entities',
    component: Outlet,
});

const entitiesIndexRoute = createRoute({
    getParentRoute: () => entitiesRoute,
    path: '/',
    validateSearch: entitiesSearch,
    component: EntitiesPage,
});

const entityRoute = createRoute({
    getParentRoute: () => entitiesRoute,
    path: '$id',
    validateSearch: tabSearch,
    component: EntitySettingsPage,
});

const entryTypesRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'entry-types',
    component: Outlet,
});

const entryTypesIndexRoute = createRoute({
    getParentRoute: () => entryTypesRoute,
    path: '/',
    validateSearch: entryTypesSearch,
    component: EntryTypesPage,
});

const entryTypeRoute = createRoute({
    getParentRoute: () => entryTypesRoute,
    path: '$id',
    validateSearch: tabSearch,
    component: EntryTypeSettingsPage,
});

const typeMappingsRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'type-mappings',
    validateSearch: tabSearch,
    component: TypeMappingsPage,
});

const adminSettingsRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'settings',
    validateSearch: tabSearch,
    component: SettingsPage,
});

const adminEnrichmentRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'enrichment',
    validateSearch: tabSearch,
    component: EnrichmentPage,
});

const notFoundRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: '$',
    component: NotFound,
});

export const panelRouteTree = rootRoute.addChildren([
    indexRoute,
    authenticatedRoute.addChildren([
        notesRoute.addChildren([notesIndexRoute, noteRoute]),
        reportsRoute,
        filesRoute,
        digestDataRoute,
        settingsRoute,
        knowledgeGraphRoute,
        enrichmentRoute.addChildren([enrichmentIndexRoute, enrichmentResultRoute]),
        dashboardRoute,
        manageRoute.addChildren([
            manageIndexRoute,
            manageAuthRoute.addChildren([
                usersRoute.addChildren([usersIndexRoute, userRoute]),
                entitiesRoute.addChildren([entitiesIndexRoute, entityRoute]),
                entryTypesRoute.addChildren([entryTypesIndexRoute, entryTypeRoute]),
                typeMappingsRoute,
                adminSettingsRoute,
                adminEnrichmentRoute,
            ]),
        ]),
        notFoundRoute,
    ]),
]);
