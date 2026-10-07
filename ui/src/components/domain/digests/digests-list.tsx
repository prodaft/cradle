import { SearchInput } from '@/components/base/search-input/search-input';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dateRangeFromUrl, dayEndIso, dayStartIso } from '@/lib/search-query/dates';
import {
    sortFromUrl,
    sortToOrderBy,
    sortToUrl,
    type DateRange,
    type SearchState,
} from '@/lib/search-query/search-schema';
import { fetchClient } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { FilePlus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import UploadDigestDialog from './dialogs/upload-digest-dialog';
import { parseParam } from './digest-list-status';
import { SEARCH_SCHEMA } from './digests-list-search-schema';
import DigestsTable from './digests-table';

type ListQuery = NonNullable<operations['intelio_digest_list']['parameters']['query']>;

const DEFAULT_ORDER_BY = '-created_at';

export default function DigestsList() {
    useDockPanelTab({ title: 'Digest data', icon: 'digest-data' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/digest-data' });
    const statusSlug = parseParam(search.status);
    const page = Number(search.digests_page ?? 1) || 1;
    const pageSize = (() => {
        const parsed = Number(search.digests_pagesize);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    })();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const queryClient = useQueryClient();

    const searchState = useMemo<SearchState>(() => {
        const created = dateRangeFromUrl(search.created_at_gte, search.created_at_lte);
        const values: Record<string, string[]> = {};
        if (statusSlug) values.status = [statusSlug];
        if (search.user) values.user = [search.user];
        const dates: Record<string, DateRange> = {};
        if (created) dates.created = created;
        return {
            q: search.title || undefined,
            values,
            dates,
            sort: sortFromUrl(
                search.digests_sort_field,
                search.digests_sort_direction,
                SEARCH_SCHEMA,
            ),
        };
    }, [
        search.title,
        search.user,
        search.created_at_gte,
        search.created_at_lte,
        search.digests_sort_field,
        search.digests_sort_direction,
        statusSlug,
    ]);

    const applySearch = useCallback(
        (state: SearchState) => {
            const created = state.dates.created;
            const sort = sortToUrl(state.sort, SEARCH_SCHEMA);
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    digests_page: 1,
                    title: state.q || undefined,
                    user: state.values.user?.[0] || undefined,
                    status: parseParam(state.values.status?.[0]),
                    created_at_gte: created?.after,
                    created_at_lte: created?.before,
                    digests_sort_field: sort.field,
                    digests_sort_direction: sort.direction,
                } as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const listQuery = useMemo((): ListQuery => {
        const entries: Record<string, unknown> = {
            page,
            page_size: pageSize,
            title: search.title || undefined,
            user: search.user || undefined,
            status: statusSlug,
            created_at_gte: dayStartIso(searchState.dates.created?.after),
            created_at_lte: dayEndIso(searchState.dates.created?.before),
            order_by:
                sortToOrderBy(searchState.sort, SEARCH_SCHEMA) ?? DEFAULT_ORDER_BY,
        };

        return Object.fromEntries(
            Object.entries(entries).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [
        page,
        pageSize,
        searchState.sort,
        searchState.dates.created,
        statusSlug,
        search.title,
        search.user,
    ]);

    const { data: digests, isLoading } = useQuery({
        queryKey: ['digests', listQuery],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digest/',
                { params: { query: listQuery } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const rows = digests?.results ?? [];
    const totalPages = digests?.total_pages ?? 1;

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['digests'] });
    }, [queryClient]);

    const goTo = (target: number) => {
        router.navigate({
            to: location.pathname as any,
            search: ((prev: any) => ({ ...prev, digests_page: target })) as any,
            replace: true,
        });
    };

    const changePageSize = (size: number) => {
        router.navigate({
            to: location.pathname as any,
            search: {
                ...search,
                digests_page: 1,
                digests_pagesize: size,
            } as any,
            replace: true,
        });
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold tracking-tight'>Digest Data</h2>
                    <p className='text-muted-foreground'>
                        Browse & Manage Imported Data
                    </p>
                </div>
                <div className='flex gap-2'>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    onClick={() => setIsUploadOpen(true)}
                                    variant='default'
                                />
                            }
                        >
                            <FilePlus />
                            New Digest
                        </TooltipTrigger>
                        <TooltipContent>
                            Upload a new digest file{' '}
                            <KbdGroup>
                                <Kbd>Ctrl</Kbd>
                                <span>+</span>
                                <Kbd>D</Kbd>
                            </KbdGroup>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {/* Digest List */}
                <DigestsTable
                    rows={rows}
                    isLoading={isLoading}
                    page={page}
                    totalPages={totalPages}
                    totalCount={digests?.count}
                    onPageChange={goTo}
                    onRefresh={invalidate}
                    pageSize={pageSize}
                    onPageSizeChange={changePageSize}
                    toolbar={
                        <SearchInput
                            schema={SEARCH_SCHEMA}
                            value={searchState}
                            onApply={applySearch}
                            placeholder='Search digests...'
                        />
                    }
                />
            </div>
            <UploadDigestDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onUpload={() => {
                    invalidate();
                }}
            />
        </div>
    );
}
