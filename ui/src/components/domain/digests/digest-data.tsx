import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchClient } from '@services/openapi/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { debounce } from 'lodash';
import { FilePlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadDigestDialog from './dialogs/upload-digest-dialog';
import DigestList from './digest-list';

const toYmd = (iso?: string) => (iso ? new Date(iso).toISOString().split('T')[0] : '');

const toStartIso = (ymd?: string | null) =>
    ymd ? new Date(ymd).toISOString() : undefined;

const toEndIso = (ymd?: string | null) => {
    if (!ymd) return undefined;
    const endDate = new Date(ymd);
    endDate.setHours(23, 59, 59, 999);
    return endDate.toISOString();
};

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
    created_at: {
        from: string;
        to: string;
    };
}

export default function DigestData() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/digest-data' });
    const searchAny = search as any;
    const sortField = searchAny?.digests_sort_field || 'created_at';
    const sortDirection: 'asc' | 'desc' = searchAny?.digests_sort_direction || 'desc';
    const pageSize = (() => {
        const parsed = Number(searchAny?.digests_pagesize);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    })();

    const [uploadDigestDialogOpen, setUploadDigestDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

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
        startDate: (search as any)?.created_at_gte
            ? toYmd((search as any)?.created_at_gte)
            : null,
        endDate: (search as any)?.created_at_lte
            ? toYmd((search as any)?.created_at_lte)
            : null,
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: (search as any)?.status || 'all',
        user: (search as any)?.author || '',
        created_at: {
            from: toYmd((search as any)?.created_at_gte),
            to: toYmd((search as any)?.created_at_lte),
        },
    });

    const searchRef = useRef(search);
    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const searchQueryParams: any = {
            page,
            page_size: pageSize,
            title: submittedFilters.title || undefined,
            author: submittedFilters.author || undefined,
            created_at_gte: submittedFilters.created_at_gte || undefined,
            created_at_lte: submittedFilters.created_at_lte || undefined,
        };

        // Add column filter parameters
        if (columnFilters.user) {
            searchQueryParams.author = columnFilters.user;
        }

        if (columnFilters.status !== 'all') {
            searchQueryParams.status = columnFilters.status;
        }

        if (columnFilters.created_at.from) {
            searchQueryParams.created_at_gte = toStartIso(
                columnFilters.created_at.from,
            );
        }
        if (columnFilters.created_at.to) {
            searchQueryParams.created_at_lte = toEndIso(columnFilters.created_at.to);
        }

        const order_by = sortDirection === 'desc' ? `-${sortField}` : sortField;
        searchQueryParams.order_by = order_by;

        return searchQueryParams;
    }, [page, pageSize, sortField, sortDirection, columnFilters, submittedFilters]);

    const { data: digestsData, isLoading } = useQuery({
        queryKey: ['digests', queryParams],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digest/',
                { params: { query: queryParams as any } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const digests = digestsData?.results ?? [];
    const totalPages = digestsData?.total_pages ?? 1;

    // Initialize filters from URL parameters
    useEffect(() => {
        const searchAny = search as any;
        const initialFilters: SearchFilters = {
            title: searchAny?.title || '',
            author: searchAny?.author || '',
        };

        const initialDateRange: DateRange = {
            startDate: searchAny?.created_at_gte
                ? toYmd(searchAny.created_at_gte)
                : null,
            endDate: searchAny?.created_at_lte ? toYmd(searchAny.created_at_lte) : null,
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
            const currentSearch = searchRef.current as any;
            const newSearch: any = {
                ...currentSearch,
                title: filters.title || undefined,
                author: filters.author || undefined,
                created_at_gte: toStartIso(dateRangeValue.startDate),
                created_at_lte: toEndIso(dateRangeValue.endDate),
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
                created_at_gte: toStartIso(dateRangeValue.startDate) ?? '',
                created_at_lte: toEndIso(dateRangeValue.endDate) ?? '',
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
        const expectedCreatedAtGte = toStartIso(dateRange.startDate) ?? '';
        const expectedCreatedAtLte = toEndIso(dateRange.endDate) ?? '';

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
        setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: {
                ...searchAny,
                digests_sort_field: newSortField,
                digests_sort_direction: newSortDirection,
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
                digests_pagesize: String(newSize),
            },
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
        setUploadDigestDialogOpen(true);
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div className='space-y-1'>
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
                    loading={isLoading}
                    page={page}
                    totalPages={totalPages}
                    handlePageChange={handlePageChange}
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
            <UploadDigestDialog
                open={uploadDigestDialogOpen}
                onOpenChange={setUploadDigestDialogOpen}
                onUpload={() => {
                    invalidateDigests();
                }}
            />
        </div>
    );
}
