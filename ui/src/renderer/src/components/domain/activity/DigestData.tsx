import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useModal } from '@/contexts/ui/ModalContext';
import type { Alert } from '@/types';
import DigestList from '@components/domain/files/DigestList';
import UploadDigestModal from '@components/modals/files/UploadDigestModal';
import type { BaseDigest } from '@services/cradle/models';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { FilePlus } from 'lucide-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const { profile } = useProfile();
    const { intelioApi } = useApi();
    const { setModal } = useModal();

    // Digest list state
    const [digests, setDigests] = useState<Digest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortField, setSortField] = useState(
        searchParams.get('digests_sort_field') || 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | undefined>(
        (searchParams.get('digests_sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('digests_pagesize')) || 10,
    );

    // Search state
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
    });

    const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters>({
        title: searchParams.get('title') || '',
        author: searchParams.get('author') || '',
        created_at_gte: searchParams.get('created_at_gte') || '',
    });

    // Date range state
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: searchParams.get('created_at_gte') || null,
        endDate: searchParams.get('created_at_lte') || null,
    });

    // Column filters for table header
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
        status: searchParams.get('status') || 'all',
        user: searchParams.get('author') || '',
        createdAt: {
            from: searchParams.get('created_at_gte')
                ? new Date(searchParams.get('created_at_gte')!)
                      .toISOString()
                      .split('T')[0]
                : '',
            to: searchParams.get('created_at_lte')
                ? new Date(searchParams.get('created_at_lte')!)
                      .toISOString()
                      .split('T')[0]
                : '',
        },
    });

    // Alert state for DigestList
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'info',
    });

    const searchParamsRef = useRef(searchParams);
    useEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    useEffect(() => {
        fetchDigests();
    }, [
        page,
        sortField,
        sortDirection,
        pageSize,
        columnFilters,
        submittedFilters,
        intelioApi,
    ]);

    // Initialize filters from URL parameters
    useEffect(() => {
        const initialFilters: SearchFilters = {
            title: searchParams.get('title') || '',
            author: searchParams.get('author') || '',
        };

        const initialDateRange: DateRange = {
            startDate: searchParams.get('created_at_gte')
                ? new Date(searchParams.get('created_at_gte')!)
                      .toISOString()
                      .split('T')[0]
                : null,
            endDate: searchParams.get('created_at_lte')
                ? new Date(searchParams.get('created_at_lte')!)
                      .toISOString()
                      .split('T')[0]
                : null,
        };

        setSearchFilters(initialFilters);
        setDateRange(initialDateRange);

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
        fetchDigests();
    }, []);

    const updateSearchParams = useCallback(
        (filters: SearchFilters, dateRangeValue: DateRange) => {
            const newParams = new URLSearchParams(searchParamsRef.current);

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

            if (dateRangeValue.startDate) {
                newParams.set(
                    'created_at_gte',
                    new Date(dateRangeValue.startDate).toISOString(),
                );
            } else {
                newParams.delete('created_at_gte');
            }

            if (dateRangeValue.endDate) {
                const endDate = new Date(dateRangeValue.endDate);
                endDate.setHours(23, 59, 59, 999);
                newParams.set('created_at_lte', endDate.toISOString());
            } else {
                newParams.delete('created_at_lte');
            }

            setSearchParams(newParams, { replace: true });

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
        [setSearchParams],
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

    const fetchDigests = async () => {
        setLoading(true);
        try {
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

            const response = await intelioApi.intelioDigestRetrieve(searchQueryParams);

            setDigests(response.results);
            setTotalPages(response.totalPages);
            setTotalCount(response.count || 0);
        } catch (error: any) {
            console.error('Failed to fetch digests', error);
            toast.error(`Error fetching digests: ${error.message}`);
            setDigests([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSort = (newSortField: string, newSortDirection: 'asc' | 'desc') => {
        setSortField(newSortField);
        setSortDirection(newSortDirection);
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

    const handleColumnFilterChange = (column: string, value: any) => {
        setColumnFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        setPage(1); // Reset to first page when filters change
    };

    const handleCreateDigest = () => {
        setModal(UploadDigestModal, {
            onUpload: () => {
                fetchDigests();
            },
        });
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Digest Data</h2>
                    <p className='text-muted-foreground'>Browse & Manage Imported Data</p>
                </div>
                <div className='flex gap-2'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleCreateDigest}
                                variant='default'
                                className='space-x-1'
                            >
                                <span>New Digest</span>
                                <FilePlus className='size-4' />
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
                    onDigestDelete={fetchDigests}
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
        </div>
    );
}
