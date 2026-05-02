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
const DigestsList = lazy(() => import('@/components/domain/digests/digests-list'));
const EnrichmentLayout = lazy(
    () => import('@/components/domain/enrichment/enrichment-layout'),
);
const EnrichmentList = lazy(
    () => import('@/components/domain/enrichment/enrichment-list'),
);
const EnrichmentResults = lazy(
    () => import('@/components/domain/enrichment/enrichment-results'),
);
const FilesList = lazy(() => import('@/components/domain/files/files-list'));
const GraphExplorer = lazy(() => import('@/components/domain/graph/graph-explorer'));
const NotesLayout = lazy(() => import('@/components/domain/notes/notes-layout'));
const NotesList = lazy(() => import('@/components/domain/notes/notes-list'));
const NoteViewer = lazy(() => import('@/components/domain/notes/note-viewer'));
const ReportsList = lazy(() => import('@/components/domain/reports/reports-list'));

const ManageEnrichmentList = lazy(
    () => import('@/components/domain/manage/enrichment/manage-enrichment-list'),
);
const EntitiesList = lazy(
    () => import('@/components/domain/manage/entity/entities-list'),
);
const EntitySettingsPage = lazy(
    () => import('@/components/domain/manage/entity/entity-settings-page'),
);
const EntryTypesList = lazy(
    () => import('@/components/domain/manage/entry-type/entry-types-list'),
);
const EntryTypeSettingsPage = lazy(
    () => import('@/components/domain/manage/entry-type/entry-type-settings-page'),
);
const ManageSettingsPage = lazy(
    () => import('@/components/domain/manage/settings/manage-settings-page'),
);
const TypeMappingsList = lazy(
    () => import('@/components/domain/manage/type-mappings/type-mappings-list'),
);
const UsersList = lazy(() => import('@/components/domain/manage/user/users-list'));
const UserSettingsPage = lazy(
    () => import('@/components/domain/manage/user/user-settings-page'),
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
    component: NotesList,
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
    component: ReportsList,
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
    component: DigestsList,
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
    component: EnrichmentList,
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
    component: UsersList,
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
    component: EntitiesList,
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
    component: EntryTypesList,
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
    component: TypeMappingsList,
});

const manageSettingsRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'settings',
    validateSearch: tabSearch,
    component: ManageSettingsPage,
});

const adminEnrichmentRoute = createRoute({
    getParentRoute: () => manageAuthRoute,
    path: 'enrichment',
    validateSearch: tabSearch,
    component: ManageEnrichmentList,
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
                manageSettingsRoute,
                adminEnrichmentRoute,
            ]),
        ]),
        notFoundRoute,
    ]),
]);
