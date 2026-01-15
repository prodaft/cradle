import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import type { Alert } from '@/types';
import DigestList from '@components/domain/files/DigestList';
import UploadDigestModal from '@components/modals/files/UploadDigestModal';
import type { BaseDigest } from '@services/cradle/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { debounce } from 'lodash';
import { FilePlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SearchFilters {
    title: string;
    author: string;
}

interface SubmittedFilters extends SearchFilters {
    created_at_gte: string;
    created_at_lte?: string;
}

interface DateRange {
    startDate: string | null;
    endDate: string | null;
}

interface ColumnFilters {
    status: string;
    user: string;
    createdAt: {
        from: string;
        to: string;
    };
}

// Use BaseDigest from generated models
type Digest = BaseDigest;

export default function DigestData() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/digest-data' });
    const { intelioApi } = useApi();
    const [uploadDigestModalOpen, setUploadDigestModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Digest list state
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState(
        (search as any)?.digests_sort_field || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | undefined>(
        (search as any)?.digests_sort_direction || 'desc',
    );
    const [pageSize, setPageSize] = useState((search as any)?.digests_pagesize || 10);

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: (search as any)?.title || '',
        author: (search as any)?.author || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters>({
        title: (search as any)?.title || '',
        author: (search as any)?.author || '',
        created_at_gte: (search as any)?.created_at_gte || '',
    });

    // Date range state
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: (search as any)?.created_at_gte || null,
        endDate: (search as any)?.created_at_lte || null,
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: (search as any)?.status || 'all',
        user: (search as any)?.author || '',
        createdAt: {
            from: (search as any)?.created_at_gte
                ? new Date((search as any).created_at_gte).toISOString().split('T')[0]
                : '',
            to: (search as any)?.created_at_lte
                ? new Date((search as any).created_at_lte).toISOString().split('T')[0]
                : '',
        },
    });

    // Alert state for DigestList
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'info',
    });

    const searchRef = useRef(search);
    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const searchQueryParams: any = {
            page,
            pageSize,
            title: submittedFilters.title || undefined,
            author: submittedFilters.author || undefined,
            createdAtGte: submittedFilters.created_at_gte || undefined,
            createdAtLte: submittedFilters.created_at_lte || undefined,
        };

        // Add column filter parameters
        if (columnFilters.user) {
            searchQueryParams.author = columnFilters.user;
        }

        if (columnFilters.status != 'all') {
            searchQueryParams.status = columnFilters.status;
        }

        if (columnFilters.createdAt.from) {
            searchQueryParams.createdAtGte = new Date(
                columnFilters.createdAt.from,
            ).toISOString();
        }
        if (columnFilters.createdAt.to) {
            const endDate = new Date(columnFilters.createdAt.to);
            endDate.setHours(23, 59, 59, 999);
            searchQueryParams.createdAtLte = endDate.toISOString();
        }

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
        searchQueryParams.orderBy = orderBy;

        return searchQueryParams;
    }, [page, pageSize, sortField, sortDirection, columnFilters, submittedFilters]);

    // Query for digests
    const { data: digestsData, isPending: loading } = useQuery({
        queryKey: ['digests', queryParams],
        queryFn: () => intelioApi.intelioDigestRetrieve(queryParams),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch digests',
        },
    });

    const digests = digestsData?.results || [];
    const totalPages = digestsData?.totalPages || 1;
    const totalCount = digestsData?.count || 0;

    // Initialize filters from URL parameters
    useEffect(() => {
        const searchAny = search as any;
        const initialFilters: SearchFilters = {
            title: searchAny?.title || '',
            author: searchAny?.author || '',
        };

        const initialDateRange: DateRange = {
            startDate: searchAny?.created_at_gte
                ? new Date(searchAny.created_at_gte).toISOString().split('T')[0]
                : null,
            endDate: searchAny?.created_at_lte
                ? new Date(searchAny.created_at_lte).toISOString().split('T')[0]
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);

        if (
            searchAny?.title ||
            searchAny?.author ||
            searchAny?.created_at_gte ||
            searchAny?.created_at_lte
        ) {
            setSubmittedFilters({
                ...initialFilters,
                created_at_gte: searchAny?.created_at_gte || '',
                created_at_lte: searchAny?.created_at_lte || '',
            });
        }
    }, [search]);

    const updateSearchParams = useCallback(
        (filters: SearchFilters, dateRangeValue: DateRange) => {
            const newSearch: any = {
                ...search,
                title: filters.title || undefined,
                author: filters.author || undefined,
                created_at_gte: dateRangeValue.startDate
                    ? new Date(dateRangeValue.startDate).toISOString()
                    : undefined,
                created_at_lte: dateRangeValue.endDate
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
                created_at_gte: dateRangeValue.startDate
                    ? new Date(dateRangeValue.startDate).toISOString()
                    : '',
                created_at_lte: dateRangeValue.endDate
                    ? (() => {
                          const endDate = new Date(dateRangeValue.endDate);
                          endDate.setHours(23, 59, 59, 999);
                          return endDate.toISOString();
                      })()
                    : '',
            });
        },
        [router, location.pathname],
    );

    const debouncedUpdateSearchParams = useMemo(
        () => debounce(updateSearchParams, 300),
        [updateSearchParams],
    );

    useEffect(() => {
        // If the current UI filters already match what we've "submitted" (i.e. what drives fetching),
        // don't schedule another URL/submittedFilters update. This avoids duplicate fetches when a submit
        // and a debounced update happen back-to-back with the same values.
        const expectedCreatedAtGte = dateRange.startDate
            ? new Date(dateRange.startDate).toISOString()
            : '';
        const expectedCreatedAtLte = dateRange.endDate
            ? (() => {
                  const endDate = new Date(dateRange.endDate);
                  endDate.setHours(23, 59, 59, 999);
                  return endDate.toISOString();
              })()
            : '';

        const matchesSubmitted =
            submittedFilters.title === (searchFilters.title || '') &&
            submittedFilters.author === (searchFilters.author || '') &&
            submittedFilters.created_at_gte === expectedCreatedAtGte &&
            (submittedFilters.created_at_lte || '') === expectedCreatedAtLte;

        if (matchesSubmitted) return;

        debouncedUpdateSearchParams(searchFilters, dateRange);
        return () => debouncedUpdateSearchParams.cancel();
    }, [searchFilters, dateRange, debouncedUpdateSearchParams, submittedFilters]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearchSubmit = (e: React.FormEvent | React.MouseEvent) => {
        (e as any).preventDefault?.();

        // If we're being called from ActionBarSearch (or other non-form submit), we may get a synthetic
        // event with a { target: { name, value } } shape. Prefer that value so submit doesn't depend
        // on any debounced/lagging state updates.
        const target = (e as any).target as
            | { name?: string; value?: string }
            | undefined;
        const hasOverride = Boolean(target?.name && typeof target?.value === 'string');

        const nextFilters = hasOverride
            ? { ...searchFilters, [target!.name!]: target!.value! }
            : searchFilters;

        if (hasOverride) {
            setSearchFilters(nextFilters);
        }

        // Prevent "double search": user submits (Enter) while a debounced update is still pending.
        debouncedUpdateSearchParams.cancel();
        updateSearchParams(nextFilters, dateRange);
    };

    // Invalidate digests query helper
    const invalidateDigests = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['digests'] });
    }, [queryClient]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
        setPage(1);

        const newSearch: any = {
            ...search,
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
            ...search,
            digests_pagesize: String(newSize),
        };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    const handleColumnFilterChange = (column: string, value: any) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        setPage(1); // Reset to first page when filters change
    };

    const handleCreateDigest = () => {
        setUploadDigestModalOpen(true);
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Digest Data</h2>
                    <p className='text-muted-foreground'>
                        Browse & Manage Imported Data
                    </p>
                </div>
                <div className='flex gap-2'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleCreateDigest} variant='default'>
                                <FilePlus />
                                New Digest
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Upload a new digest file{' '}
                            <KbdGroup>
                                <Kbd>Ctrl</Kbd>
                                <span>+</span>
                                <Kbd>D</Kbd>
                            </KbdGroup>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Content Area */}
            <div className='flex flex-col space-y-4 p-4'>
                {/* Digest List */}
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
                    onColumnFilterChange={handleColumnFilterChange}
                    columnFilters={columnFilters}
                    searchFilters={{
                        title: searchFilters.title,
                        author: searchFilters.author,
                    }}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                />
            </div>
            <UploadDigestModal
                open={uploadDigestModalOpen}
                onOpenChange={setUploadDigestModalOpen}
                onUpload={() => {
                    invalidateDigests();
                }}
            />
        </div>
    );
}
