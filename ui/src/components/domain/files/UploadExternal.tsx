import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import useApi from '@/hooks/api/useApi';
import type { Alert } from '@/types';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { DigestSubclass } from '@services/cradle/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import DigestList from './DigestList';

interface DataTypeOption {
    value: string;
    label: string;
    inferEntities: boolean;
}

interface SearchFilters {
    title: string;
    author: string;
}

interface SubmittedFilters extends SearchFilters {
    created_at_gte?: string;
    created_at_lte?: string;
}

// Use local DateRange type
type DateRange = {
    startDate: Date | null;
    endDate: Date | null;
};

// Type for search params from route
type DigestDataSearchParams = {
    digests_sort_field?: string;
    digests_sort_direction?: 'asc' | 'desc';
    digests_pagesize?: number;
    title?: string;
    author?: string;
    created_at_gte?: string;
    created_at_lte?: string;
    status?: string;
};

export default function UploadExternal() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const rawSearch = useSearch({ from: '/_authenticated/digest-data' });
    const searchParams = (
        rawSearch && typeof rawSearch === 'object' && 'title' in rawSearch
            ? rawSearch
            : {}
    ) as DigestDataSearchParams;
    const { intelioApi } = useApi();
    const queryClient = useQueryClient();

    // Digest list state
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState(
        searchParams.digests_sort_field || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        searchParams.digests_sort_direction || 'desc',
    );
    const [pageSize, setPageSize] = useState(searchParams.digests_pagesize || 10);

    // Alert state
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'info',
    });

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: searchParams.title || '',
        author: searchParams.author || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters>({
        title: searchParams.title || '',
        author: searchParams.author || '',
    });

    // Date range state
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: searchParams.created_at_gte
            ? new Date(searchParams.created_at_gte)
            : null,
        endDate: searchParams.created_at_lte
            ? new Date(searchParams.created_at_lte)
            : null,
    });

    // Query for data type options
    const { data: dataTypesResponse } = useQuery({
        queryKey: ['digestDataTypes'],
        queryFn: () => intelioApi.intelioDigestOptionsList(),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load data types',
        },
    });

    const dataTypeOptions = useMemo(() => {
        if (!dataTypesResponse) return [];
        return dataTypesResponse.map((type: DigestSubclass) => ({
            value: type.className,
            label: type.name,
            inferEntities: type.inferEntities,
        }));
    }, [dataTypesResponse]);

    // Prepare query parameters for digests
    const queryParams = useMemo(() => {
        const searchQueryParams: any = {
            page,
            pageSize,
            title: submittedFilters.title || undefined,
            author: submittedFilters.author || undefined,
            createdAtGte: submittedFilters.created_at_gte || undefined,
            createdAtLte: submittedFilters.created_at_lte || undefined,
        };

        // Add sorting
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        searchQueryParams.orderBy = orderBy;

        return searchQueryParams;
    }, [page, pageSize, submittedFilters, sortField, sortDirection]);

    // Query for digests
    const { data: digestsData, isPending: loading } = useQuery({
        queryKey: ['digests', 'external', queryParams],
        queryFn: () => intelioApi.intelioDigestRetrieve(queryParams),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch digests',
        },
    });

    const digests = digestsData?.results || [];
    const totalPages = digestsData?.totalPages || 1;

    // Add an effect to initialize filters and date range from URL parameters
    useEffect(() => {
        const initialFilters: SearchFilters = {
            title: searchParams.title || '',
            author: searchParams.author || '',
        };

        const initialDateRange: DateRange = {
            startDate: searchParams.created_at_gte
                ? new Date(searchParams.created_at_gte)
                : null,
            endDate: searchParams.created_at_lte
                ? new Date(searchParams.created_at_lte)
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);

        // Set initial submitted filters if URL has parameters
        if (
            searchParams.title ||
            searchParams.author ||
            searchParams.created_at_gte ||
            searchParams.created_at_lte
        ) {
            setSubmittedFilters({
                ...initialFilters,
                created_at_gte: searchParams.created_at_gte || '',
                created_at_lte: searchParams.created_at_lte || '',
            });
        }
    }, [searchParams]);

    const updateSearchParams = (filters: SearchFilters, dateRangeValue: DateRange) => {
        const newSearch: any = {
            ...searchParams,
            title: filters.title || undefined,
            author: filters.author || undefined,
            created_at_gte: dateRangeValue?.startDate
                ? new Date(dateRangeValue.startDate).toISOString()
                : undefined,
            created_at_lte: dateRangeValue?.endDate
                ? (() => {
                      const endDate = new Date(dateRangeValue.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      return endDate.toISOString();
                  })()
                : undefined,
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

        setSubmittedFilters({
            ...filters,
            created_at_gte: dateRangeValue?.startDate
                ? new Date(dateRangeValue.startDate).toISOString()
                : '',
            created_at_lte: dateRangeValue?.endDate
                ? (() => {
                      const endDate = new Date(dateRangeValue.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      return endDate.toISOString();
                  })()
                : '',
        });
    };

    // Auto-update search when filters or date range change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            updateSearchParams(searchFilters, dateRange);
        }, 500); // Debounce for 500ms

        return () => clearTimeout(timeoutId);
    }, [searchFilters, dateRange]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDateRangeChange = (value: any) => {
        setDateRange(value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSearchParams(searchFilters, dateRange);
    };

    // Invalidate digests query helper
    const invalidateDigests = () => {
        queryClient.invalidateQueries({ queryKey: ['digests', 'external'] });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        // Reset to first page when sorting changes
        setPage(1);

        const newSearch: any = {
            ...searchParams,
            digests_sort_field: newSortField,
            digests_sort_direction: newSortDirection,
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
            ...searchParams,
            digests_pagesize: String(newSize),
        };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    return (
        <>
            <div className='flex items-center mb-4'>
                <h2 className='text-xl font-semibold flex items-center gap-2 ml-4'>
                    Upload External Data
                </h2>
            </div>

            {/* Search Section */}
            <div className='w-full'>
                <form
                    onSubmit={handleSearchSubmit}
                    className='flex space-x-4 px-3 pb-2'
                >
                    <DateRangePicker
                        startDate={dateRange.startDate}
                        endDate={dateRange.endDate}
                        onChange={([start, end]) => {
                            handleDateRangeChange({
                                startDate: start,
                                endDate: end,
                            });
                        }}
                        className='h-9 flex-grow !max-w-full w-full font-mono'
                        placeholderText='Select date range'
                    />
                    <Input
                        type='text'
                        name='title'
                        value={searchFilters.title}
                        onChange={handleSearchChange}
                        placeholder='Search by title'
                        className='!max-w-full w-full'
                    />
                    <Input
                        type='text'
                        name='author'
                        value={searchFilters.author}
                        onChange={handleSearchChange}
                        placeholder='Search by user'
                        className='!max-w-full w-full'
                    />
                    <Button type='submit' variant='default' size='default'>
                        <MagnifyingGlassIcon /> Search
                    </Button>
                </form>
            </div>

            {/* Digest List Section */}
            <div className='mt-4'>
                <DigestList
                    digests={digests}
                    loading={loading}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={handlePageChange}
                    setAlert={setAlert}
                    onDigestDelete={invalidateDigests}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    pageSize={pageSize}
                    setPageSize={handlePageSizeChange}
                    dataTypeOptions={dataTypeOptions}
                    onUpload={invalidateDigests}
                />
            </div>
        </>
    );
}
