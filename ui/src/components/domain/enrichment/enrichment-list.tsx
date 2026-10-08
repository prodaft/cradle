import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
import OfflineIndicator from '@/components/feedback/offline-indicator';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import {
    sortFromUrl,
    sortToOrderBy,
    sortToUrl,
    type SearchState,
} from '@/lib/search-query/search-schema';
import { cn } from '@/lib/utils';
import { fetchClient } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SEARCH_SCHEMA } from './enrichment-list-search-schema';
import { parseParam } from './enrichment-list-status';
import EnrichmentTable from './enrichment-table';

type ListQuery = NonNullable<
    operations['enrichment_request_list']['parameters']['query']
>;

const DEFAULT_ORDER_BY = '-created_at';

export interface EnrichmentListProps {
    hidePageHeader?: boolean;
    entryId?: number;
}

interface ListParams {
    title?: string;
    status?: string;
    user?: string;
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

function toSearchState(params: ListParams): SearchState {
    const status = parseParam(params.status);
    return {
        q: params.title || undefined,
        values: {
            ...(status ? { status: [status] } : {}),
            ...(params.user ? { user: [params.user] } : {}),
        },
        dates: {},
        sort: sortFromUrl(params.sort_field, params.sort_direction, SEARCH_SCHEMA),
    };
}

function toListParams(state: SearchState): ListParams {
    const sort = sortToUrl(state.sort, SEARCH_SCHEMA);
    return {
        title: state.q || undefined,
        status: parseParam(state.values.status?.[0]),
        user: state.values.user?.[0] || undefined,
        sort_field: sort.field,
        sort_direction: sort.direction,
    };
}

export default function EnrichmentList({
    hidePageHeader = false,
    entryId,
}: EnrichmentListProps = {}) {
    useDockPanelTab({ title: 'Enrichment', icon: 'enrichment' }, !hidePageHeader);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const isScoped = entryId != null;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [scopedPage, setScopedPage] = useState(1);
    const [scopedPageSize, setScopedPageSize] = useState(20);
    const [scopedParams, setScopedParams] = useState<ListParams>({});

    const params: ListParams = isScoped
        ? scopedParams
        : {
              title: search.title as string | undefined,
              status: search.status as string | undefined,
              user: search.user as string | undefined,
              sort_field: search.sort_field as string | undefined,
              sort_direction: search.sort_direction as 'asc' | 'desc' | undefined,
          };
    const { title, status, user, sort_field, sort_direction } = params;
    const activePage = isScoped ? scopedPage : Number(search.page ?? 1) || 1;
    const pageSize = isScoped ? scopedPageSize : Number(search.pagesize) || 20;

    const searchState = useMemo(
        () =>
            toSearchState({
                title,
                status,
                user,
                sort_field,
                sort_direction,
            }),
        [title, status, user, sort_field, sort_direction],
    );

    const listQuery = useMemo((): ListQuery => {
        return Object.fromEntries(
            Object.entries({
                page: activePage,
                page_size: pageSize,
                title: title || undefined,
                user: user || undefined,
                status: parseParam(status),
                // Unknown sort fields (stale URLs) fall back to the default instead of a 400.
                order_by:
                    sortToOrderBy(searchState.sort, SEARCH_SCHEMA) ?? DEFAULT_ORDER_BY,
                ...(entryId != null ? { entry_id: String(entryId) } : {}),
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [activePage, pageSize, title, user, status, searchState.sort, entryId]);

    const {
        data: requestsPage,
        isLoading,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.enrichment.requests.list(listQuery),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/',
                { params: { query: listQuery } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const rows = requestsPage?.results ?? [];
    const totalPages = requestsPage?.total_pages ?? 1;

    const navigateSearch = useCallback(
        (patch: Record<string, unknown>) => {
            const next: Record<string, unknown> = { ...search, ...patch };
            for (const key of Object.keys(next)) {
                if (next[key] === undefined || next[key] === '') delete next[key];
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const goToPage = useCallback(
        (target: number) => {
            if (isScoped) {
                setScopedPage(target);
            } else {
                navigateSearch({ page: target });
            }
        },
        [isScoped, navigateSearch],
    );

    const applySearch = useCallback(
        (state: SearchState) => {
            const next = toListParams(state);
            if (isScoped) {
                setScopedParams(next);
                setScopedPage(1);
            } else {
                navigateSearch({ ...next, page: 1 });
            }
        },
        [isScoped, navigateSearch],
    );

    const deleteRequest = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/intelio/enrich/{enrichment_id}/',
                { params: { path: { enrichment_id: id } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
        },
    });

    const rerunRequest = useMutation({
        mutationFn: async (id: string) => {
            const { data, error, response } = await fetchClient.POST(
                '/intelio/enrich/{enrichment_id}/restart/',
                { params: { path: { enrichment_id: id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
        },
    });

    const changePageSize = (size: number) => {
        if (isScoped) {
            setScopedPageSize(size);
            setScopedPage(1);
        } else {
            navigateSearch({ page: 1, pagesize: String(size) });
        }
    };

    const deleteRequests = async (ids: string[]) => {
        if (!ids?.length) return false;

        try {
            await Promise.all(ids.map((id) => deleteRequest.mutateAsync(id)));
            toast.success(`Deleted ${ids.length} enrichment request(s)`);
            return true;
        } catch {
            return false;
        }
    };

    const rerunRequests = async (ids: string[]) => {
        if (ids.length === 0) return false;

        try {
            await Promise.all(ids.map((id) => rerunRequest.mutateAsync(id)));
            toast.success(
                `Retrying ${ids.length} enrichment request${ids.length > 1 ? 's' : ''}`,
            );
            return true;
        } catch {
            return false;
        }
    };

    return (
        <div className='w-full h-full'>
            {!hidePageHeader && (
                <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>
                            Enrichment
                        </h2>
                        <p className='text-muted-foreground'>
                            Browse & Manage Enrichment Requests
                        </p>
                    </div>
                    <div className='flex gap-2'>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        onClick={() => setIsCreateOpen(true)}
                                        variant='default'
                                    />
                                }
                            >
                                <Sparkles />
                                New Request
                            </TooltipTrigger>
                            <TooltipContent>
                                Create a new enrichment request{' '}
                                <KbdGroup>
                                    <Kbd>Ctrl</Kbd>
                                    <span>+</span>
                                    <Kbd>E</Kbd>
                                </KbdGroup>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}

            <div className={cn('flex flex-col space-y-4', !hidePageHeader && 'p-4')}>
                {isPaused && <OfflineIndicator />}

                <EnrichmentTable
                    rows={rows}
                    isLoading={isLoading}
                    page={activePage}
                    totalPages={totalPages}
                    totalCount={requestsPage?.count}
                    onPageChange={goToPage}
                    pageSize={pageSize}
                    onPageSizeChange={changePageSize}
                    searchState={searchState}
                    onSearchApply={applySearch}
                    onDelete={deleteRequests}
                    onRerun={rerunRequests}
                />
            </div>
            {!hidePageHeader && (
                <EnrichmentRequestDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={() => {
                        toast.success('Enrichment request created successfully');
                    }}
                />
            )}
        </div>
    );
}
