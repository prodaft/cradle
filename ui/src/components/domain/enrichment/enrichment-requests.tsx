import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
import InProgress from '@/components/feedback/in-progress';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { fetchClient } from '@services/openapi/client';
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
import EnrichmentRequestsList from './enrichment-request-table';

interface SearchFilters {
    title: string;
}

interface ColumnFilters {
    status: string;
    user: string;
}

const IS_PROD = import.meta.env.VITE_ENV === 'production';

export default function EnrichmentRequests() {
    useDockPanelTab({ title: 'Enrichment', icon: 'enrichment' });
    if (IS_PROD) return <InProgress />;
    return <EnrichmentRequestsInner />;
}

function EnrichmentRequestsInner() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/enrichment/' });
    const searchAny = search as any;
    const sortField = searchAny?.sort_field || 'created_at';
    const sortDirection: 'asc' | 'desc' = searchAny?.sort_direction || 'desc';
    const pageSize = Number(searchAny?.pagesize) || 20;

    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

    // Search state (title only — user filter lives in columnFilters)
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: (search as any)?.title || '',
    });

    // Initialize from URL so the first fetch fires immediately (no null gating)
    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>({
        title: (search as any)?.title || '',
    });

    // Column filters for table header (user filter is authoritative here)
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: (search as any)?.status || 'all',
        user: (search as any)?.user__username || '',
    });

    const queryParams = useMemo(() => {
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        return {
            page,
            page_size: pageSize,
            title: submittedFilters.title || undefined,
            user__username: columnFilters.user || undefined,
            status: columnFilters.status === 'all' ? undefined : columnFilters.status,
            order_by: orderBy,
        };
    }, [page, pageSize, submittedFilters, columnFilters, sortField, sortDirection]);

    const {
        data: requestsData,
        isLoading,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.enrichment.requests.list(queryParams),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/enrich/',
                { params: { query: queryParams as any } },
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
            },
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
            },
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
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold tracking-tight'>Enrichment</h2>
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

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {isPaused && <OfflineIndicator />}

                {/* Enrichment Requests List */}
                <EnrichmentRequestsList
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
                    onCreateRequest={handleCreateRequest}
                />
            </div>
            <EnrichmentRequestDialog
                open={enrichmentDialogOpen}
                onOpenChange={setEnrichmentDialogOpen}
                onSuccess={() => {
                    toast.success('Enrichment request created successfully');
                }}
            />
        </div>
    );
}
