import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
import OfflineIndicator from '@/components/feedback/offline-indicator';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { fetchClient } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { parseParam, toFilterValue } from './enrichment-list-status';
import EnrichmentTable from './enrichment-table';

type ListQuery = NonNullable<
    operations['enrichment_request_list']['parameters']['query']
>;

interface Filters {
    status: string;
    user: string;
}

export interface EnrichmentListProps {
    hidePageHeader?: boolean;
    /** Scope list to enrichment requests for this entry (dashboard). */
    entryId?: number;
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
    const status = isScoped ? undefined : parseParam(search.status);
    const sortField = (search.sort_field as string) || 'created_at';
    const sortDirection: 'asc' | 'desc' =
        (search.sort_direction as 'asc' | 'desc') || 'desc';
    const pageSize = Number(search.pagesize) || 20;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [page, setPage] = useState(1);
    const activePage = isScoped ? page : Number(search.page ?? 1) || 1;

    const [applied, setApplied] = useState((search.title as string) || '');

    const [filters, setFilters] = useState<Filters>({
        status: toFilterValue(status),
        user: (search.user__username as string) || '',
    });

    const listQuery = useMemo((): ListQuery => {
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        const apiStatus = isScoped
            ? parseParam(filters.status === 'all' ? undefined : filters.status)
            : status;

        return Object.fromEntries(
            Object.entries({
                page: activePage,
                page_size: pageSize,
                title: applied || undefined,
                user__username: filters.user || undefined,
                status: apiStatus,
                order_by: orderBy,
                ...(entryId != null ? { entry_id: String(entryId) } : {}),
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [
        activePage,
        pageSize,
        applied,
        filters,
        sortField,
        sortDirection,
        entryId,
        status,
        isScoped,
    ]);

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

    useEffect(() => {
        if (isScoped) return;
        setFilters((prev) => ({
            ...prev,
            status: toFilterValue(status),
            user: (search.user__username as string) || '',
        }));
    }, [search.user__username, status, isScoped]);

    const goToPage = useCallback(
        (target: number) => {
            if (isScoped) {
                setPage(target);
                return;
            }
            router.navigate({
                to: location.pathname as any,
                search: ((prev: any) => ({ ...prev, page: target })) as any,
                replace: true,
            });
        },
        [isScoped, router, location.pathname],
    );

    const applySearch = useCallback(
        (value: string) => {
            if (isScoped) {
                setPage(1);
            } else {
                const next: any = { ...search, page: 1, title: value || undefined };
                Object.keys(next).forEach((key) => {
                    if (next[key] === undefined || next[key] === '') {
                        delete next[key];
                    }
                });
                router.navigate({
                    to: location.pathname as any,
                    search: next,
                    replace: true,
                });
            }
            setApplied(value);
        },
        [search, router, location.pathname, isScoped],
    );

    const deleteRequest = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/intelio/enrich/{id}/',
                { params: { path: { id } } },
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
                '/intelio/enrich/{id}/restart/',
                { params: { path: { id } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
        },
    });

    const applySort = (field: string, direction: 'asc' | 'desc') => {
        if (isScoped) setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: {
                ...search,
                ...(isScoped ? {} : { page: 1 }),
                sort_field: field,
                sort_direction: direction,
            } as any,
            replace: true,
        });
    };

    const changePageSize = (size: number) => {
        if (isScoped) setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: {
                ...search,
                ...(isScoped ? {} : { page: 1 }),
                pagesize: String(size),
            } as any,
            replace: true,
        });
    };

    const applyFilter = (column: keyof Filters, value: string) => {
        if (column === 'status') {
            const parsed = parseParam(value);
            if (!isScoped) {
                const next: Record<string, unknown> = { ...search, page: 1 };
                if (parsed) {
                    next.status = parsed;
                } else {
                    delete next.status;
                }
                router.navigate({
                    to: location.pathname as any,
                    search: next as any,
                    replace: true,
                });
            } else {
                goToPage(1);
            }
            setFilters((prev) => ({
                ...prev,
                status: toFilterValue(parsed),
            }));
            return;
        }

        if (column === 'user' && !isScoped) {
            const next: Record<string, unknown> = { ...search, page: 1 };
            if (value) {
                next.user__username = value;
            } else {
                delete next.user__username;
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
            setFilters((prev) => ({
                ...prev,
                user: value || '',
            }));
            return;
        }

        setFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        goToPage(1);
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
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => setIsCreateOpen(true)}
                                    variant='default'
                                >
                                    <Sparkles />
                                    New Request
                                </Button>
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
                    onPageChange={goToPage}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={applySort}
                    pageSize={pageSize}
                    onPageSizeChange={changePageSize}
                    onColumnFilterChange={applyFilter}
                    filters={filters}
                    initialSearch={applied}
                    onSearchSubmit={applySearch}
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
