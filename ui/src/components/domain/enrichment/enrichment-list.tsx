import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
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
import {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { toast } from 'sonner';
import OfflineIndicator from '../../feedback/offline-indicator';
import EnrichmentTable from './enrichment-table';

type EnrichmentListQuery = NonNullable<
    operations['enrichment_request_list']['parameters']['query']
>;

/** `/enrichment` route and dashboard enrichment tab: header + fetch + `EnrichmentTable`. */
interface SearchFilters {
    title: string;
}

interface ColumnFilters {
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
    const search = useSearch({ strict: false }) as Record<string, unknown>;
    const searchAny = search;
    const sortField = (searchAny?.sort_field as string) || 'created_at';
    const sortDirection: 'asc' | 'desc' =
        (searchAny?.sort_direction as 'asc' | 'desc') || 'desc';
    const pageSize = Number(searchAny?.pagesize) || 20;

    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: (searchAny?.title as string) || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>({
        title: (searchAny?.title as string) || '',
    });

    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: (searchAny?.status as string) || 'all',
        user: (searchAny?.user__username as string) || '',
    });

    const queryParams = useMemo((): EnrichmentListQuery => {
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        const statusRaw =
            columnFilters.status === 'all' ? undefined : columnFilters.status;
        const statusAllowed: EnrichmentListQuery['status'][] = [
            'done',
            'error',
            'waiting',
            'warning',
            'working',
        ];
        const status = statusAllowed.includes(
            statusRaw as EnrichmentListQuery['status'],
        )
            ? (statusRaw as EnrichmentListQuery['status'])
            : undefined;

        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                title: submittedFilters.title || undefined,
                user__username: columnFilters.user || undefined,
                status,
                order_by: orderBy,
                ...(entryId != null ? { entry_id: String(entryId) } : {}),
            }).filter(([, v]) => v !== undefined),
        ) as EnrichmentListQuery;
    }, [
        page,
        pageSize,
        submittedFilters,
        columnFilters,
        sortField,
        sortDirection,
        entryId,
    ]);

    const {
        data: requestsData,
        isLoading,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.enrichment.requests.list(queryParams),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/',
                { params: { query: queryParams } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const reqAny = requestsData as any;
    const enrichmentRequests = reqAny?.results || [];
    const totalPages = reqAny?.total_pages ?? reqAny?.totalPages ?? 1;

    const updateSearchParams = useCallback(
        (filters: SearchFilters) => {
            setPage(1);
            const newSearch: any = {
                ...search,
                title: filters.title || undefined,
            };

            Object.keys(newSearch).forEach((key) => {
                if (newSearch[key] === undefined || newSearch[key] === '') {
                    delete newSearch[key];
                }
            });

            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
            setSubmittedFilters(filters);
        },
        [search, router, location.pathname],
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearchParams(searchFilters);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchFilters, updateSearchParams]);

    const deleteMutation = useMutation({
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

    const rerunMutation = useMutation({
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

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        updateSearchParams(searchFilters);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: {
                ...searchAny,
                sort_field: newSortField,
                sort_direction: newSortDirection,
            } as any,
            replace: true,
        });
    };

    const handlePageSizeChange = (newSize: number) => {
        setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: {
                ...searchAny,
                pagesize: String(newSize),
            } as any,
            replace: true,
        });
    };

    const handleColumnFilterChange = (column: keyof ColumnFilters, value: string) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        setPage(1);
    };

    const handleCreateRequest = () => {
        setEnrichmentDialogOpen(true);
    };

    const handleDeleteSelected = async (ids: string[]) => {
        if (!ids?.length) return;

        try {
            await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
            toast.success(`Deleted ${ids.length} enrichment request(s)`);
            setSelectedRequests([]);
        } catch {
            // Error toast shown by global mutation handler
        }
    };

    const handleRerunSelected = async () => {
        if (selectedRequests.length === 0) return;

        try {
            await Promise.all(
                selectedRequests.map((id) => rerunMutation.mutateAsync(id)),
            );
            toast.success(
                `Retrying ${selectedRequests.length} enrichment request${selectedRequests.length > 1 ? 's' : ''}`,
            );
            setSelectedRequests([]);
        } catch {
            // Error toast shown by global mutation handler
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
                                <Button onClick={handleCreateRequest} variant='default'>
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

            {/* Content Area */}
            <div className={cn('flex flex-col space-y-4', !hidePageHeader && 'p-4')}>
                {isPaused && <OfflineIndicator />}

                {/* Enrichment Requests List */}
                <EnrichmentTable
                    enrichmentRequests={enrichmentRequests}
                    loading={isLoading}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={setPage}
                    onRequestDelete={() => {
                        // Query will automatically refetch due to invalidation
                    }}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    pageSize={pageSize}
                    setPageSize={handlePageSizeChange}
                    onColumnFilterChange={handleColumnFilterChange}
                    columnFilters={columnFilters}
                    searchFilters={searchFilters}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                    selectedRequests={selectedRequests}
                    setSelectedRequests={setSelectedRequests}
                    onDeleteSelected={handleDeleteSelected}
                    onRerunSelected={handleRerunSelected}
                    onCreateRequest={hidePageHeader ? () => {} : handleCreateRequest}
                />
            </div>
            {!hidePageHeader && (
                <EnrichmentRequestDialog
                    open={enrichmentDialogOpen}
                    onOpenChange={setEnrichmentDialogOpen}
                    onSuccess={() => {
                        toast.success('Enrichment request created successfully');
                    }}
                />
            )}
        </div>
    );
}
