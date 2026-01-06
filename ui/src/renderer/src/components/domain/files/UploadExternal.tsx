import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { useProfile } from '@/hooks/auth/useProfile';
import type { Alert } from '@/types';
import Datepicker from '@components/base/Datepicker/Datepicker';
import type { BaseDigest, DigestSubclass } from '@services/cradle/models';
import { Search } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function UploadExternal() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [dataTypeOptions, setDataTypeOptions] = useState<DataTypeOption[]>([]);
    const { notify } = useNotif();
    const { profile } = useProfile();
    const { intelioApi } = useApi();
    const { execute } = useAPICall();

    // Digest list state
    const [digests, setDigests] = useState<BaseDigest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState(
        searchParams.get('digests_sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (searchParams.get('digests_sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('digests_pagesize')) || 10,
    );

    // Alert state
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'info',
    });

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters>({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
    });

    // Date range state
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: searchParams.get('created_at_gte')
            ? new Date(searchParams.get('created_at_gte')!)
            : null,
        endDate: searchParams.get('created_at_lte')
            ? new Date(searchParams.get('created_at_lte')!)
            : null,
    });

    useEffect(() => {
        execute(() => intelioApi.intelioDigestOptionsList())
            .then((response) => {
                if (response) {
                    const dataTypes: DataTypeOption[] = response.map(
                        (type: DigestSubclass) => ({
                            value: type.className,
                            label: type.name,
                            inferEntities: type.inferEntities,
                        }),
                    );
                    setDataTypeOptions(dataTypes);
                } else {
                    notify({
                        type: 'error',
                        text: 'Failed to load data types',
                    });
                }
            })
            .catch(() => {});

        // Initial fetch of digests with search params
        fetchDigests();
    }, [
        page,
        submittedFilters,
        sortField,
        sortDirection,
        pageSize,
        intelioApi,
        execute,
    ]);

    // Add an effect to initialize filters and date range from URL parameters
    useEffect(() => {
        const initialFilters: SearchFilters = {
            title: searchParams.get('title') || '',
            author: searchParams.get('author') || '',
        };

        const initialDateRange: DateRange = {
            startDate: searchParams.get('created_at_gte')
                ? new Date(searchParams.get('created_at_gte')!)
                : null,
            endDate: searchParams.get('created_at_lte')
                ? new Date(searchParams.get('created_at_lte')!)
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);

        // Set initial submitted filters if URL has parameters
        if (
            searchParams.has('title') ||
            searchParams.has('author') ||
            searchParams.has('created_at_gte') ||
            searchParams.has('created_at_lte')
        ) {
            setSubmittedFilters({
                ...initialFilters,
                created_at_gte: searchParams.get('created_at_gte') || '',
                created_at_lte: searchParams.get('created_at_lte') || '',
            });
        }
    }, []);

    const updateSearchParams = (filters: SearchFilters, dateRangeValue: DateRange) => {
        const newParams = new URLSearchParams(searchParams);

        if (filters.title) {
            newParams.set('title', filters.title);
        } else {
            newParams.delete('title');
        }

        if (filters.author) {
            newParams.set('author', filters.author);
        } else {
            newParams.delete('author');
        }

        // Add date range parameters if they exist
        if (dateRangeValue?.startDate) {
            newParams.set(
                'created_at_gte',
                new Date(dateRangeValue.startDate).toISOString(),
            );
        } else {
            newParams.delete('created_at_gte');
        }

        if (dateRangeValue?.endDate) {
            // Set end date to end of day
            const endDate = new Date(dateRangeValue.endDate);
            endDate.setHours(23, 59, 59, 999);
            newParams.set('created_at_lte', endDate.toISOString());
        } else {
            newParams.delete('created_at_lte');
        }

        setSearchParams(newParams, { replace: true });

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

    const fetchDigests = async () => {
        setLoading(true);
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

        execute(() => intelioApi.intelioDigestRetrieve(searchQueryParams))
            .then((response) => {
                setDigests(response.results);
                setTotalPages(response.totalPages);
            })
            .catch((error) => {
                console.error('Failed to fetch digests', error);
                setDigests([]);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        // Reset to first page when sorting changes
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('digests_sort_field', newSortField);
        newParams.set('digests_sort_direction', newSortDirection);
        setSearchParams(newParams, { replace: true });
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);

        const newParams = new URLSearchParams(searchParams);
        newParams.set('digests_pagesize', String(newSize));
        setSearchParams(newParams, { replace: true });
    };

    return (
        <>
            <div className=''>
                <div className='flex items-center mb-4'>
                    <h2 className='text-xl font-semibold flex items-center gap-2 ml-4'>
                        Upload External Data
                    </h2>
                </div>

                {/* Search Section */}
                <div>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex space-x-4 px-3 pb-2'
                    >
                        <Datepicker
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            onChange={([start, end]) => {
                                handleDateRangeChange({
                                    startDate: start,
                                    endDate: end,
                                });
                            }}
                            className='input input-block py-1 px-2 text-sm flex-grow !max-w-full w-full'
                            placeholderText='Select date range'
                        />
                        <input
                            type='text'
                            name='title'
                            value={searchFilters.title}
                            onChange={handleSearchChange}
                            placeholder='Search by title'
                            className='input !max-w-full w-full'
                        />
                        <input
                            type='text'
                            name='author'
                            value={searchFilters.author}
                            onChange={handleSearchChange}
                            placeholder='Search by user'
                            className='input !max-w-full w-full'
                        />
                        <button type='submit' className='btn'>
                            <Search /> Search
                        </button>
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
                        onDigestDelete={fetchDigests}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        pageSize={pageSize}
                        setPageSize={handlePageSizeChange}
                        dataTypeOptions={dataTypeOptions}
                        onUpload={fetchDigests}
                    />
                </div>
            </div>
        </>
    );
}
