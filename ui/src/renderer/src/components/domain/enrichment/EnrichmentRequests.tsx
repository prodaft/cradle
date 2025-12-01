import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import InProgress from '@components/feedback/InProgress';
import EnrichmentRequestModal from '@components/modals/enrichment/EnrichmentRequestModal';
import { EnrichmentRequestList } from '@services/cradle';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DateRangeFilter } from '../../base/ListView/ListView';
import EnrichmentRequestsList from './EnrichmentRequestsList';

interface SearchFilters {
    title: string;
    user: string;
}

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    user: string;
}

export default function EnrichmentRequests() {
    if (import.meta.env.VITE_ENV === 'production') {
        return <InProgress />;
    }

    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const { intelioApi } = useApi();
    const { setModal } = useModal();

    // Enrichment requests list state
    const [enrichmentRequests, setEnrichmentRequests] = useState<
        EnrichmentRequestList[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(
        searchParams.get('sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>((searchParams.get('sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('pagesize')) || 25,
    );
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: searchParams.get('title') || '',
        user: searchParams.get('user__username') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters>({
        title: searchParams.get('title') || '',
        user: searchParams.get('user__username') || '',
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        user: searchParams.get('user__username') || '',
    });

    const fetchEnrichmentRequests = useCallback(async () => {
        console.log('fetchEnrichmentRequests called');
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

            console.log(
                'Calling enrichmentRequestList with params:',
                searchQueryParams,
            );
            const response = await intelioApi.enrichmentRequestList(searchQueryParams);
            console.log('API response:', response);

            setEnrichmentRequests(response.results || []);
            setTotalPages(response.totalPages || 1);
        } catch (error: any) {
            console.error('Failed to fetch enrichment requests', error);
            notify({
                type: 'error',
                text: `Error fetching enrichment requests: ${error.message}`,
            });
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
        intelioApi,
        notify,
    ]);

    useEffect(() => {
        fetchEnrichmentRequests();
    }, [fetchEnrichmentRequests]);

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
                notify({
                    type: 'success',
                    text: 'Enrichment request created successfully',
                });
                fetchEnrichmentRequests();
            },
            onError: (error: Error) => {
                notify({
                    type: 'error',
                    text: `Error creating enrichment request: ${error.message}`,
                });
            },
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedRequests.length === 0) return;

        try {
            // Delete all selected requests
            await Promise.all(
                selectedRequests.map((id) =>
                    intelioApi.enrichmentDetailDelete({ id: id })
                )
            );

            notify({
                type: 'success',
                text: `Deleted ${selectedRequests.length} enrichment request(s)`,
            });
            setSelectedRequests([]);
            fetchEnrichmentRequests();
        } catch (error: any) {
            notify({
                type: 'error',
                text: `Error deleting enrichment requests: ${error.message}`,
            });
        }
    };

    const handleRetrySelected = async () => {
        if (selectedRequests.length === 0) return;

        try {
            // Retry all selected requests
            await Promise.all(
                selectedRequests.map((id) =>
                    intelioApi.enrichmentRestart({ id: id })
                )
            );

            notify({
                type: 'success',
                text: `Retried ${selectedRequests.length} enrichment request(s)`,
            });
            setSelectedRequests([]);
            fetchEnrichmentRequests();
        } catch (error: any) {
            notify({
                type: 'error',
                text: `Error retrying enrichment requests: ${error.message}`,
            });
        }
    };

    return (
        <div className='w-full h-full'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Enrichment Requests
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Browse & Manage Enrichment Requests
                    </p>
                </div>
                <button
                    className='cradle-btn cradle-btn-primary flex items-center justify-center w-10 h-10 text-white text-xl font-bold'
                    onClick={handleCreateRequest}
                >
                    +
                </button>
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
                    onRetrySelected={handleRetrySelected}
                />
            </div>
        </div>
    );
}
