import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '@/contexts/ModalContext/ModalContext';
import { useNotif } from '@/contexts/NotificationContext/NotificationContext';
import useApi from '@/hooks/useApi/useApi';
import InProgress from '../InProgress/InProgress';
import EnrichmentRequestModal from './EnrichmentRequestModal';
import EnrichmentRequestsList from './EnrichmentRequestsList';

export default function EnrichmentRequests() {
    if (import.meta.env.VITE_ENV === 'production') {
        return <InProgress />;
    }

    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotif();
    const { intelioApi } = useApi();
    const { setModal } = useModal();

    // Enrichment requests list state
    const [enrichmentRequests, setEnrichmentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(searchParams.get('sort_field') || 'created_at');
    const [sortDirection, setSortDirection] = useState(searchParams.get('sort_direction') || 'desc');
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('pagesize')) || 25
    );

    // Search state
    const [searchFilters, setSearchFilters] = useState({
        title: searchParams.get('title') || '',
        user: searchParams.get('user__username') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState({
        title: searchParams.get('title') || '',
        user: searchParams.get('user__username') || '',
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState({
        user: searchParams.get('user__username') || '',
    });

    const fetchEnrichmentRequests = useCallback(async () => {
        console.log('fetchEnrichmentRequests called');
        setLoading(true);
        try {
            const searchQueryParams = {
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

            console.log('Calling enrichmentRequestList with params:', searchQueryParams);
            const response = await intelioApi.enrichmentRequestList(searchQueryParams);
            console.log('API response:', response);

            setEnrichmentRequests(response.results || []);
            setTotalPages(response.totalPages || 1);
        } catch (error) {
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
    }, [page, pageSize, submittedFilters, columnFilters, sortField, sortDirection, intelioApi]);

    useEffect(() => {
        fetchEnrichmentRequests();
    }, [fetchEnrichmentRequests]);

    // Initialize filters from URL parameters
    useEffect(() => {
        const initialFilters = {
            title: searchParams.get('title') || '',
            user: searchParams.get('user__username') || '',
        };

        setSearchFilters(initialFilters);

        if (
            searchParams.has('title') ||
            searchParams.has('user__username')
        ) {
            setSubmittedFilters(initialFilters);
        }
    }, []);

    const updateSearchParams = useCallback((filters) => {
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
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearchParams(searchFilters);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchFilters, updateSearchParams]);

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateSearchParams(searchFilters);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleSort = (newSortField, newSortDirection) => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort_field', newSortField);
        newParams.set('sort_direction', newSortDirection);
        setSearchParams(newParams, { replace: true });
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('pagesize', String(newSize));
        setSearchParams(newParams, { replace: true });
    };

    const handleColumnFilterChange = (column, value) => {
        setColumnFilters(prev => ({
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
            onError: (error) => {
                notify({
                    type: 'error',
                    text: `Error creating enrichment request: ${error.message}`,
                });
            },
        });
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
                    className='btn btn-primary'
                    onClick={handleCreateRequest}
                >
                    Create Request
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
                />
            </div>
        </div>
    );
}
