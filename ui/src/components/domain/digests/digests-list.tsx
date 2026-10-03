import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchClient } from '@services/openapi/client';
import type { operations } from '@services/openapi/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { debounce } from 'lodash';
import { FilePlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadDigestDialog from './dialogs/upload-digest-dialog';
import { parseParam, toFilterValue } from './digest-list-status';
import DigestsTable from './digests-table';

type ListQuery = NonNullable<operations['intelio_digest_list']['parameters']['query']>;

const toYmd = (iso?: string): string => {
    if (!iso) return '';
    const part = new Date(iso).toISOString().split('T')[0];
    return part ?? '';
};

const toStartIso = (ymd?: string | null) =>
    ymd ? new Date(ymd).toISOString() : undefined;

const toEndIso = (ymd?: string | null) => {
    if (!ymd) return undefined;
    const endDate = new Date(ymd);
    endDate.setHours(23, 59, 59, 999);
    return endDate.toISOString();
};

interface Draft {
    title: string;
    author: string;
}

interface Applied extends Draft {
    created_at_gte: string;
    created_at_lte?: string;
}

interface DateRange {
    startDate: string | null;
    endDate: string | null;
}

interface Filters {
    status: string;
    user: string;
    created_at: {
        from: string;
        to: string;
    };
}

export default function DigestsList() {
    useDockPanelTab({ title: 'Digest data', icon: 'digest-data' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ from: '/_authenticated/digest-data' });
    const statusSlug = parseParam(search.status);
    const page = Number(search.digests_page ?? 1) || 1;
    const sortField = search.digests_sort_field || 'created_at';
    const sortDirection: 'asc' | 'desc' = search.digests_sort_direction || 'desc';
    const pageSize = (() => {
        const parsed = Number(search.digests_pagesize);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    })();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const queryClient = useQueryClient();

    const [draft, setDraft] = useState<Draft>({
        title: search.title || '',
        author: search.author || '',
    });

    const [applied, setApplied] = useState<Applied>({
        title: search.title || '',
        author: search.author || '',
        created_at_gte: search.created_at_gte || '',
    });

    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: search.created_at_gte ? toYmd(search.created_at_gte) : null,
        endDate: search.created_at_lte ? toYmd(search.created_at_lte) : null,
    });

    const [filters, setFilters] = useState<Filters>({
        status: toFilterValue(statusSlug),
        user: search.author || '',
        created_at: {
            from: toYmd(search.created_at_gte),
            to: toYmd(search.created_at_lte),
        },
    });

    const searchRef = useRef(search);
    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    const listQuery = useMemo((): ListQuery => {
        const entries: Record<string, unknown> = {
            page,
            page_size: pageSize,
            title: applied.title || undefined,
            author: applied.author || undefined,
            created_at_gte: applied.created_at_gte || undefined,
            created_at_lte: applied.created_at_lte || undefined,
        };

        if (filters.user) {
            entries.author = filters.user;
        }

        if (statusSlug) {
            entries.status = statusSlug;
        }

        if (filters.created_at.from) {
            entries.created_at_gte = toStartIso(filters.created_at.from);
        }
        if (filters.created_at.to) {
            entries.created_at_lte = toEndIso(filters.created_at.to);
        }

        const order_by = sortDirection === 'desc' ? `-${sortField}` : sortField;
        entries.order_by = order_by;

        return Object.fromEntries(
            Object.entries(entries).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [page, pageSize, sortField, sortDirection, filters, applied, statusSlug]);

    const { data: digests, isLoading } = useQuery({
        queryKey: ['digests', listQuery],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/intelio/digest/',
                { params: { query: listQuery } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: true,
        },
    });

    const rows = digests?.results ?? [];
    const totalPages = digests?.total_pages ?? 1;

    useEffect(() => {
        const searchDraft: Draft = {
            title: search.title || '',
            author: search.author || '',
        };

        const range: DateRange = {
            startDate: search.created_at_gte ? toYmd(search.created_at_gte) : null,
            endDate: search.created_at_lte ? toYmd(search.created_at_lte) : null,
        };

        setDraft(searchDraft);
        setDateRange(range);
        setFilters((prev) => ({
            ...prev,
            status: toFilterValue(statusSlug),
            user: search.author || '',
            created_at: {
                from: toYmd(search.created_at_gte),
                to: toYmd(search.created_at_lte),
            },
        }));

        if (
            search.title ||
            search.author ||
            search.created_at_gte ||
            search.created_at_lte
        ) {
            setApplied({
                ...searchDraft,
                created_at_gte: search.created_at_gte || '',
                created_at_lte: search.created_at_lte || '',
            });
        }
    }, [search, statusSlug]);

    const applyFilters = useCallback(
        (nextDraft: Draft, dateRangeValue: DateRange) => {
            const next: any = {
                ...searchRef.current,
                digests_page: 1,
                title: nextDraft.title || undefined,
                author: nextDraft.author || undefined,
                created_at_gte: toStartIso(dateRangeValue.startDate),
                created_at_lte: toEndIso(dateRangeValue.endDate),
            };

            Object.keys(next).forEach((key) => {
                if (next[key] === undefined || next[key] === '') {
                    delete next[key];
                }
            });

            router.navigate({
                to: location.pathname as any,
                search: next,
                replace: true,
            });

            setApplied({
                ...nextDraft,
                created_at_gte: toStartIso(dateRangeValue.startDate) ?? '',
                created_at_lte: toEndIso(dateRangeValue.endDate) ?? '',
            });
        },
        [router, location.pathname],
    );

    const debouncedApplyFilters = useMemo(
        () => debounce(applyFilters, 300),
        [applyFilters],
    );

    useEffect(() => {
        const expectedCreatedAtGte = toStartIso(dateRange.startDate) ?? '';
        const expectedCreatedAtLte = toEndIso(dateRange.endDate) ?? '';

        const matchesApplied =
            applied.title === (draft.title || '') &&
            applied.author === (draft.author || '') &&
            applied.created_at_gte === expectedCreatedAtGte &&
            (applied.created_at_lte || '') === expectedCreatedAtLte;

        if (matchesApplied) return;

        debouncedApplyFilters(draft, dateRange);
        return () => debouncedApplyFilters.cancel();
    }, [draft, dateRange, debouncedApplyFilters, applied]);

    const updateDraft = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDraft((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const applySearch = (e: React.SyntheticEvent | React.MouseEvent) => {
        (e as any).preventDefault?.();

        const target = (e as any).target as
            { name?: string; value?: string } | undefined;
        const fromTarget = Boolean(target?.name && typeof target?.value === 'string');

        const next = fromTarget ? { ...draft, [target!.name!]: target!.value! } : draft;

        if (fromTarget) {
            setDraft(next);
        }

        debouncedApplyFilters.cancel();
        applyFilters(next, dateRange);
    };

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['digests'] });
    }, [queryClient]);

    const goTo = (target: number) => {
        router.navigate({
            to: location.pathname as any,
            search: ((prev: any) => ({ ...prev, digests_page: target })) as any,
            replace: true,
        });
    };

    const applySort = (field: string, direction: 'asc' | 'desc') => {
        router.navigate({
            to: location.pathname as any,
            search: {
                ...search,
                digests_page: 1,
                digests_sort_field: field,
                digests_sort_direction: direction,
            } as any,
            replace: true,
        });
    };

    const changePageSize = (size: number) => {
        router.navigate({
            to: location.pathname as any,
            search: {
                ...search,
                digests_page: 1,
                digests_pagesize: size,
            } as any,
            replace: true,
        });
    };

    const applyColumnFilter = (column: string, value: any) => {
        if (column === 'status') {
            const next: Record<string, unknown> = { ...search, digests_page: 1 };
            const parsed = parseParam(value);
            if (parsed) {
                next.status = parsed;
            } else {
                delete next.status;
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
            setFilters((prev) => ({
                ...prev,
                status: toFilterValue(parsed),
            }));
            return;
        }

        if (column === 'created_at') {
            const range = value as { from?: string; to?: string };
            const next: Record<string, unknown> = { ...search, digests_page: 1 };
            const gte = toStartIso(range.from || null);
            const lte = toEndIso(range.to || null);
            if (gte) next.created_at_gte = gte;
            else delete next.created_at_gte;
            if (lte) next.created_at_lte = lte;
            else delete next.created_at_lte;
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
            setFilters((prev) => ({
                ...prev,
                created_at: {
                    from: range.from || '',
                    to: range.to || '',
                },
            }));
            return;
        }

        if (column === 'user') {
            const next: Record<string, unknown> = { ...search, digests_page: 1 };
            if (value) {
                next.author = value;
            } else {
                delete next.author;
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
            setFilters((prev) => ({
                ...prev,
                user: value || '',
            }));
            return;
        }

        setFilters((prev) => ({
            ...prev,
            [column]: value,
        }));
        goTo(1);
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
                            <Button
                                onClick={() => setIsUploadOpen(true)}
                                variant='default'
                            >
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
                <DigestsTable
                    rows={rows}
                    isLoading={isLoading}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={goTo}
                    onRefresh={invalidate}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={applySort}
                    pageSize={pageSize}
                    onPageSizeChange={changePageSize}
                    onColumnFilterChange={applyColumnFilter}
                    filters={filters}
                    draft={{
                        title: draft.title,
                        author: draft.author,
                    }}
                    onSearchChange={updateDraft}
                    onSearchSubmit={applySearch}
                />
            </div>
            <UploadDigestDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onUpload={() => {
                    invalidate();
                }}
            />
        </div>
    );
}
