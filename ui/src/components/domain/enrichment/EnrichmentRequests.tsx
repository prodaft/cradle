import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/EnrichmentRequestDialog';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';
import { parseAPIError } from '@/utils/api';
import InProgress from '@/components/feedback/in-progress';
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
import { DateRangeFilter } from '../../base/ListView/types';
import OfflineIndicator from '../../feedback/offline-indicator';
import EnrichmentRequestsList from './EnrichmentRequestsList';

interface SearchFilters {
    title: string;
    user: string;
}

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
    user: string;
}

export default function EnrichmentRequests() {
    if (import.meta.env.VITE_ENV === 'production') {
        return <InProgress />;
    }

    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/enrichment' });
    const { intelioApi } = useApi();
    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);

    // Enrichment requests list state
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState(
        (search as any)?.sort_field || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (search as any)?.sort_direction || 'desc',
    );
    const [pageSize, setPageSize] = useState((search as any)?.pagesize || 20);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: (search as any)?.title || '',
        user: (search as any)?.user__username || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(
        null,
    );

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: (search as any)?.status || 'all',
        user: (search as any)?.user__username || '',
    });

    // Prepare query parameters
    const queryParams = useMemo(() => {
        if (!submittedFilters) return null;

        const searchQueryParams: any = {
            page,
            pageSize,
            title: submittedFilters.title || undefined,
            userUsername: submittedFilters.user || undefined,
        };

        // Add column filter parameters
        if (columnFilters.user) {
            searchQueryParams.userUsername = columnFilters.user;
        }

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        searchQueryParams.orderBy = orderBy;
        searchQueryParams.status =
            columnFilters.status == 'all' ? undefined : columnFilters.status;

        return searchQueryParams;
    }, [page, pageSize, submittedFilters, columnFilters, sortField, sortDirection]);

    // Query for enrichment requests
    const {
        data: requestsData,
        isPending,
        isPaused,
    } = useQuery({
        queryKey: queryKeys.enrichment.requests.list({
            page,
            pageSize,
            ...queryParams,
        }),
        queryFn: () => intelioApi.enrichmentRequestList(queryParams!),
        enabled: queryParams != null,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch enrichment requests',
        },
    });

    const enrichmentRequests = requestsData?.results || [];
    const totalPages = requestsData?.totalPages || 1;
    const totalCount = requestsData?.count || 0;

    // Initialize submittedFilters from URL parameters on mount
    useEffect(() => {
        const searchAny = search as any;
        if (searchAny?.title || searchAny?.user__username) {
            setSubmittedFilters({
                title: searchAny?.title || '',
                user: searchAny?.user__username || '',
            });
        }
    }, [search]);

    const updateSearchParams = useCallback(
        (filters: SearchFilters) => {
            const newSearch: any = {
                ...search,
                title: filters.title || undefined,
                user__username: filters.user || undefined,
            };

            // Remove undefined values
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

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

        const newSearch: any = {
            ...search,
            sort_field: newSortField,
            sort_direction: newSortDirection,
        };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);

        const newSearch: any = {
            ...search,
            pagesize: String(newSize),
        };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    const handleColumnFilterChange = (
        column: keyof ColumnFilters,
        value: string | DateRangeFilter,
    ) => {
        if (typeof value !== 'string') return;
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        setPage(1); // Reset to first page when filters change
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => intelioApi.enrichmentDetailDelete({ id }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
        },
    });

    // Rerun mutation
    const rerunMutation = useMutation({
        mutationFn: (id: string) => intelioApi.enrichmentRestart({ id }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
        },
    });

    const handleCreateRequest = () => {
        setEnrichmentDialogOpen(true);
    };

    const handleDeleteSelected = async (ids: string[]) => {
        if (!ids?.length) return;

        try {
            await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
            toast.success(`Deleted ${ids.length} enrichment request(s)`);
            setSelectedRequests([]);
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(parsed.detail);
        }
    };

    const handleRerunSelected = async () => {
        if (selectedRequests.length === 0) return;

        try {
            // Retry all selected requests
            await Promise.all(
                selectedRequests.map((id) => rerunMutation.mutateAsync(id)),
            );
            toast.success(
                `Retrying ${selectedRequests.length} enrichment request${selectedRequests.length > 1 ? 's' : ''}`,
            );
            setSelectedRequests([]);
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(parsed.detail);
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
                    loading={isPending && !isPaused}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={handlePageChange}
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
                onError={async (error: Error) => {
                    const parsed = await parseAPIError(error);
                    toast.error(parsed.detail);
                }}
            />
        </div>
    );
}
