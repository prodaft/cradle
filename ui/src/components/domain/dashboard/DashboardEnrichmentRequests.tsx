import useApi from '@/hooks/api/use-api';
import { queryKeys } from '@/hooks/query';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DateRangeFilter } from '../../base/ListView/types';
import EnrichmentRequestsList from '../enrichment/EnrichmentRequestsList';

interface DashboardEnrichmentRequestsProps {
    entryId: number;
}

interface SearchFilters {
    title: string;
    user: string;
}

interface ColumnFilters {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
    user: string;
}

export default function DashboardEnrichmentRequests({
    entryId,
}: DashboardEnrichmentRequestsProps) {
    const { intelioApi } = useApi();

    // Enrichment requests list state
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [pageSize, setPageSize] = useState(10);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: '',
        user: '',
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: 'all',
        user: '',
    });

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const userUsername =
            (columnFilters.user ? columnFilters.user : searchFilters.user) || undefined;

        const searchQueryParams: any = {
            page,
            pageSize,
            entryId: entryId.toString(),
            title: searchFilters.title || undefined,
            userUsername,
        };

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        searchQueryParams.orderBy = orderBy;
        searchQueryParams.status =
            columnFilters.status === 'all' ? undefined : columnFilters.status;

        return searchQueryParams;
    }, [
        page,
        pageSize,
        entryId,
        searchFilters,
        columnFilters,
        sortField,
        sortDirection,
    ]);

    // Query for enrichment requests
    const { data: requestsData, isPending } = useQuery({
        queryKey: queryKeys.enrichment.requests.list(queryParams),
        queryFn: () => intelioApi.enrichmentRequestList(queryParams),
        meta: {
            showErrorToast: true,
        },
    });

    const enrichmentRequests = requestsData?.results || [];
    const totalPages = requestsData?.totalPages || 1;

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

    const handleColumnFilterChange = (
        column: keyof ColumnFilters,
        value: string | DateRangeFilter,
    ) => {
        if ((column === 'status' || column === 'user') && typeof value !== 'string')
            return;
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        setPage(1);
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
        <EnrichmentRequestsList
            enrichmentRequests={enrichmentRequests}
            loading={isPending}
            page={page}
            totalPages={totalPages}
            handlePageChange={setPage}
            onRequestDelete={() => {}}
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
            onCreateRequest={() => {}}
        />
    );
}
