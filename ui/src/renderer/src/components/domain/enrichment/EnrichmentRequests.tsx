import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import useAPICall from '@/hooks/api/useAPICall';
import InProgress from '@components/feedback/InProgress';
import EnrichmentRequestModal from '@components/modals/enrichment/EnrichmentRequestModal';
import { EnrichmentRequestList } from '@services/cradle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Sparkles } from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DateRangeFilter } from '../../base/ListView/types';
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

    const [searchParams, setSearchParams] = useSearchParams();
    const { intelioApi } = useApi();
    const { execute } = useAPICall();
    const { setModal } = useModal();

    // Enrichment requests list state
    const [enrichmentRequests, setEnrichmentRequests] = useState<
        EnrichmentRequestList[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortField, setSortField] = useState(
        searchParams.get('sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (searchParams.get('sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('pagesize')) || 10,
    );
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: searchParams.get('title') || '',
        user: searchParams.get('user__username') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(
        null,
    );

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: searchParams.get('status') || 'all',
        user: searchParams.get('user__username') || '',
    });

    const fetchEnrichmentRequests = useCallback(async () => {
        if (!submittedFilters) return;
        setLoading(true);
        try {
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

            const response = await intelioApi.enrichmentRequestList(searchQueryParams);
            console.log('API response:', response);

            setEnrichmentRequests(response.results || []);
            setTotalPages(response.totalPages || 1);
            setTotalCount(response.count || 0);
        } catch (error: any) {
            console.error('Failed to fetch enrichment requests', error);
            toast.error(`Error fetching enrichment requests: ${error.message}`);
            setEnrichmentRequests([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [
        page,
        pageSize,
        submittedFilters,
        columnFilters,
        sortField,
        sortDirection,
    ]);

    useEffect(() => {
        fetchEnrichmentRequests();
    }, [page, pageSize, submittedFilters, columnFilters, sortField, sortDirection]);

    // Initialize filters from URL parameters
    useEffect(() => {
        const initialFilters: SearchFilters = {
            title: searchParams.get('title') || '',
            user: searchParams.get('user__username') || '',
        };

        setSearchFilters(initialFilters);

        if (searchParams.has('title') || searchParams.has('user__username')) {
            setSubmittedFilters(initialFilters);
        }
    }, []);

    const updateSearchParams = useCallback(
        (filters: SearchFilters) => {
            const newParams = new URLSearchParams(searchParams);

            if (filters.title) {
                newParams.set('title', filters.title);
            } else {
                newParams.delete('title');
            }

            if (filters.user) {
                newParams.set('user__username', filters.user);
            } else {
                newParams.delete('user__username');
            }

            setSearchParams(newParams, { replace: true });
            setSubmittedFilters(filters);
        },
        [searchParams, setSearchParams],
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

        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort_field', newSortField);
        newParams.set('sort_direction', newSortDirection);
        setSearchParams(newParams, { replace: true });
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('pagesize', String(newSize));
        setSearchParams(newParams, { replace: true });
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

    const handleCreateRequest = () => {
        setModal(EnrichmentRequestModal, {
            onSuccess: () => {
                toast.success('Enrichment request created successfully');
                fetchEnrichmentRequests();
            },
            onError: (error: Error) => {
                toast.error(`Error creating enrichment request: ${error.message}`);
            },
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedRequests.length === 0) return;

        try {
            // Delete all selected requests
            await Promise.all(
                selectedRequests.map((id) =>
                    intelioApi.enrichmentDetailDelete({ id: id }),
                ),
            );

            toast.success(`Deleted ${selectedRequests.length} enrichment request(s)`);
            setSelectedRequests([]);
            fetchEnrichmentRequests();
        } catch (error: any) {
            toast.error(`Error deleting enrichment requests: ${error.message}`);
        }
    };

    const handleRerunSelected = async () => {
        if (selectedRequests.length === 0) return;

        // Retry all selected requests
        await Promise.all(
            selectedRequests.map((id) =>
                execute(() => intelioApi.enrichmentRestart({ id: id })),
            ),
        );

        toast.success(`Retrying ${selectedRequests.length} enrichment request${selectedRequests.length > 1 ? 's' : ''}`);
        setSelectedRequests([]);
        fetchEnrichmentRequests();
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Enrichment Requests</h2>
                    <p className='text-muted-foreground'>Browse & Manage Enrichment Requests</p>
                </div>
                <div className='flex gap-2'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleCreateRequest}
                                variant='default'
                                className='space-x-1'
                            >
                                <span>New Request</span>
                                <Sparkles className='size-4' />
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
                {/* Enrichment Requests List */}
                <EnrichmentRequestsList
                    enrichmentRequests={enrichmentRequests}
                    loading={loading}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={handlePageChange}
                    onRequestDelete={fetchEnrichmentRequests}
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
        </div>
    );
}
