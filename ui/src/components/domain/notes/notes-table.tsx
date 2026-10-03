import {
    ActionBarButton,
    ActionBarSearch,
} from '@/components/base/action-bar-controls/action-bar-controls';
import PreviewTip from '@/components/base/preview/preview-tip';
import StatusHeaderDropdown from '@/components/base/status-header-dropdown/status-header-dropdown';
import { StatusIcon, type StatusType } from '@/components/base/status-icon/status-icon';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { DateRangeFilterButton } from '@/components/custom/data-table/data-table-date-range-filter';
import EnrichmentRequestDialog from '@/components/domain/enrichment/dialogs/enrichment-request-dialog';
import ReportGenerationDialog from '@/components/domain/reports/dialogs/report-generation-dialog';
import OfflineIndicator from '@/components/feedback/offline-indicator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { DateRangeFilter, type SortDirection } from '@/types/list-view';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { parseMarkdownInline } from '@/utils/parser';
import {
    ArrowClockwiseIcon,
    ChartBarIcon,
    DotsThreeIcon,
    PlusCircleIcon,
    SparkleIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    ColumnDef,
    type RowSelectionState,
    SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { startCase } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { StatusSlug } from './note-list-status';
import { NotePreviewContent } from './note-preview-content';

type NoteRow = components['schemas']['NoteListResponse'];
type NoteMetadata = { title?: string; description?: string };
type OptimizedEntryResponse = components['schemas']['OptimizedEntryResponse'];

type ListQuery = NonNullable<operations['notes_list']['parameters']['query']>;

const SORT_FIELD_MAPPING: Record<string, string> = {
    title: 'title',
    description: 'timestamp',
    author: 'author__username',
    editor: 'editor__username',
    timestamp: 'timestamp',
    edit_timestamp: 'edit_timestamp',
};

/**
 * Props for `NotesTable`: fields sent to GET `/notes/` plus URL-scoped keys
 * not present on the generated `notes_list` operation (until OpenAPI is updated).
 */
export type NotesTableQueryInput = Partial<Omit<ListQuery, 'linked_to'>> & {
    linked_to?: number | string;
    editor__username?: string;
    linked_to_exact_match?: boolean;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
};

interface Filters {
    [key: string]: string | DateRangeFilter | undefined;
    status: string;
    author: string;
    editor: string;
    timestamp: DateRangeFilter;
    edit_timestamp: DateRangeFilter;
}

interface SearchField {
    value: string;
    onChange?: (value: string) => void;
    onSubmit?: (value?: string) => void;
}

interface NotesTableProps {
    scope: NotesTableQueryInput | null;
    hideFleetingNotes?: boolean;
    noteActions?: unknown[];
    hideActionBar?: boolean;
    references?: unknown;
    onFilterChange?: ((column: string, value: string | DateRangeFilter) => void) | null;
    contentSearch?: SearchField | null;
    onCreateNote?: (() => void) | null;
    onCount?: ((count: { current: number; total: number }) => void) | null;
}

export default function NotesTable({
    scope,
    hideFleetingNotes = false,
    noteActions: _noteActions = [],
    hideActionBar = false,
    references: _references = null,
    onFilterChange = null,
    contentSearch = null,
    onCreateNote = null,
    onCount = null,
}: NotesTableProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const { isAdmin } = useAuthState();
    const page = Number(search?.notes_page ?? 1) || 1;
    const sortField = (search?.notes_sort_field ?? 'timestamp') as string;
    const sortDirection: SortDirection = (search?.notes_sort_direction ??
        'desc') as SortDirection;
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportNotes, setReportNotes] = useState<
        Array<{ id: string; title: string }>
    >([]);
    const [isEnrichOpen, setIsEnrichOpen] = useState(false);
    const [enrichNotes, setEnrichNotes] = useState<
        Array<{ id: string; title: string; entities: OptimizedEntryResponse[] }>
    >([]);
    const [isRelinkOpen, setIsRelinkOpen] = useState(false);
    const queryClient = useQueryClient();

    const relinkNotes = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.POST('/notes/relink/', {
                body: undefined,
            });
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const pageSize = Number(search?.notes_pagesize ?? 20) || 20;
    const [filters, setFilters] = useState<Filters>({
        status: 'all',
        any_field: scope?.any_field || '',
        author: scope?.author__username || '',
        editor: scope?.editor__username || '',
        timestamp: {
            from:
                scope?.created_date_from && scope?.created_date_to
                    ? scope.created_date_from
                    : '',
            to:
                scope?.created_date_from && scope?.created_date_to
                    ? scope.created_date_to
                    : '',
        },
        edit_timestamp: {
            from:
                scope?.updated_date_from && scope?.updated_date_to
                    ? scope.updated_date_from
                    : '',
            to:
                scope?.updated_date_from && scope?.updated_date_to
                    ? scope.updated_date_to
                    : '',
        },
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const applySort = useCallback(
        (sorting: SortingState) => {
            const next: any = {
                ...search,
                notes_page: 1,
            };
            if (sorting.length === 0) {
                delete next.notes_sort_field;
                delete next.notes_sort_direction;
            } else {
                const sort = sorting[0];
                if (!sort) {
                    delete next.notes_sort_field;
                    delete next.notes_sort_direction;
                } else {
                    const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                    next.notes_sort_field = apiField;
                    next.notes_sort_direction = sort.desc ? 'desc' : 'asc';
                }
            }
            router.navigate({
                to: location.pathname as any,
                search: next as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const applyFilter = useCallback(
        (column: string, value: string | DateRangeFilter) => {
            setFilters((prev) => ({
                ...prev,
                [column]: value,
            }));

            if (onFilterChange) {
                onFilterChange(column, value);
            }
        },
        [onFilterChange],
    );

    const updateStatus = useCallback(
        (status: string) => {
            setFilters((prev) => ({
                ...prev,
                status,
            }));
            router.navigate({
                to: location.pathname as any,
                search: { ...search, notes_page: 1 } as any,
                replace: true,
            });
        },
        [router, location.pathname, search],
    );

    useEffect(() => {
        setFilters({
            any_field: scope?.any_field || '',
            author: scope?.author__username || '',
            editor: scope?.editor__username || '',
            timestamp: {
                from:
                    scope?.created_date_from && scope?.created_date_to
                        ? scope.created_date_from
                        : '',
                to:
                    scope?.created_date_from && scope?.created_date_to
                        ? scope.created_date_to
                        : '',
            },
            edit_timestamp: {
                from:
                    scope?.updated_date_from && scope?.updated_date_to
                        ? scope.updated_date_from
                        : '',
                to:
                    scope?.updated_date_from && scope?.updated_date_to
                        ? scope.updated_date_to
                        : '',
            },
            status: 'all',
        });
    }, [
        scope?.any_field,
        scope?.author__username,
        scope?.editor__username,
        scope?.created_date_from,
        scope?.created_date_to,
        scope?.updated_date_from,
        scope?.updated_date_to,
    ]);

    const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;
    const createdRange =
        Boolean(filters.timestamp?.from) && Boolean(filters.timestamp?.to);
    const updatedRange =
        Boolean(filters.edit_timestamp?.from) && Boolean(filters.edit_timestamp?.to);

    const listQuery = useMemo((): ListQuery | null => {
        if (!scope) return null;

        const exclusiveStatuses: StatusSlug[] = [
            'fleeting',
            'healthy',
            'warning',
            'invalid',
            'processing',
        ];
        const apiStatus: ListQuery['status'] | undefined =
            filters.status === 'all'
                ? hideFleetingNotes
                    ? ['finalized']
                    : undefined
                : exclusiveStatuses.includes(filters.status as StatusSlug)
                  ? [filters.status as StatusSlug]
                  : undefined;

        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                order_by: orderBy,
                linked_to:
                    scope.linked_to != null ? String(scope.linked_to) : undefined,
                status: apiStatus,
                any_field: scope.any_field,
                content: scope.content,
                author__username: scope.author__username,
                date: scope.date,
                references: scope.references,
                timestamp_gte: createdRange ? filters.timestamp.from : undefined,
                timestamp_lte: createdRange ? filters.timestamp.to : undefined,
                edit_timestamp_gte: updatedRange
                    ? filters.edit_timestamp.from
                    : undefined,
                edit_timestamp_lte: updatedRange
                    ? filters.edit_timestamp.to
                    : undefined,
                truncate: scope.truncate,
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [
        page,
        pageSize,
        scope,
        filters.status,
        hideFleetingNotes,
        filters.timestamp,
        filters.edit_timestamp,
        createdRange,
        updatedRange,
        orderBy,
    ]);

    const {
        data: notesData,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/notes/',
        listQuery != null ? { params: { query: listQuery } } : undefined,
        {
            enabled: scope != null && listQuery != null,
            meta: {
                showErrorToast: true,
            },
        },
    );

    const rows = useMemo(() => notesData?.results ?? [], [notesData]);
    const totalPages = notesData?.total_pages || 1;
    const totalCount = notesData?.count || 0;

    useEffect(() => {
        if (onCount) {
            onCount({ current: rows.length, total: totalCount });
        }
    }, [rows.length, totalCount, onCount]);

    const confirmRelink = useCallback(() => {
        setIsRelinkOpen(true);
    }, []);

    const executeRelink = useCallback(async () => {
        await relinkNotes.mutateAsync();
        toast.success('Relinking all notes...');
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.apiList() });
    }, [relinkNotes, queryClient]);

    const goTo = useCallback(
        (target: number) => {
            router.navigate({
                to: location.pathname as any,
                search: ((prev: any) => ({ ...prev, notes_page: target })) as any,
                replace: true,
            });
        },
        [router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== pageSize) {
                const next: any = {
                    ...search,
                    notes_page: 1,
                    notes_pagesize: size,
                };
                router.navigate({
                    to: location.pathname as any,
                    search: next as any,
                    replace: true,
                });
            } else if (target !== page) {
                goTo(target);
            }
        },
        [page, pageSize, search, router, location.pathname, goTo],
    );

    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: id } },
            });
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.notes.apiList() }],
            suppressNotification: true,
        },
    });

    const deleteNotes = async (noteIds: string[]) => {
        try {
            const results = await Promise.allSettled(
                noteIds.map((id) => deleteNote.mutateAsync(id)),
            );

            const successes = results.filter((r) => r.status === 'fulfilled').length;
            const failures = results.filter((r) => r.status === 'rejected').length;

            if (failures === 0) {
                toast.success(
                    `Successfully deleted ${successes} note${successes > 1 ? 's' : ''}`,
                );
            } else if (successes === 0) {
                const firstRejected = results.find(
                    (r) => r.status === 'rejected',
                ) as PromiseRejectedResult;
                const parsed = await parseAPIError(firstRejected.reason);
                toast.error(getDisplayMessage(parsed));
            } else {
                toast.warning(
                    `Deleted ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
                );
            }

            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    const sorting = useMemo<SortingState>(() => {
        const columnId =
            Object.keys(SORT_FIELD_MAPPING).find(
                (key) => SORT_FIELD_MAPPING[key] === sortField,
            ) || sortField;

        return columnId
            ? [
                  {
                      id: columnId,
                      desc: sortDirection === 'desc',
                  },
              ]
            : [];
    }, [sortField, sortDirection]);

    const applySorting = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater;
            applySort(next);
        },
        [applySort, sorting],
    );

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const confirmDelete = useCallback(
        (item?: NoteRow) => {
            if (item?.id) {
                setPendingDeleteIds([String(item.id)]);
                setIsDeleteOpen(true);
                return;
            }
            if (checkedIds.length === 0) return;
            setPendingDeleteIds(checkedIds);
            setIsDeleteOpen(true);
        },
        [checkedIds],
    );

    const renderPreview = useCallback((item: NoteRow) => {
        return <NotePreviewContent note={item} />;
    }, []);

    const columns = useMemo<ColumnDef<NoteRow>[]>(
        () => [
            {
                id: 'select',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label='Select all'
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label='Select row'
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const item = row.original;
                    const status = item.fleeting ? 'fleeting' : item.status;
                    if (!status) return null;
                    const label = item.fleeting ? 'Fleeting' : startCase(status);
                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant='outline'
                                    className='py-1 [&>svg]:size-3.5 capitalize'
                                >
                                    <StatusIcon
                                        status={status as StatusType}
                                        size={14}
                                    />
                                    <span>{label}</span>
                                </Badge>
                            </TooltipTrigger>
                            {item.status_message && (
                                <TooltipContent>{item.status_message}</TooltipContent>
                            )}
                        </Tooltip>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'title',
                id: 'title',
                meta: { label: 'Title' },
                header: 'Title',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <PreviewTip
                            content={renderPreview(item)}
                            side='top'
                            align='start'
                            sideOffset={32}
                            size='lg'
                            openDelay={800}
                        >
                            <div
                                className='truncate w-64 cursor-pointer'
                                onClick={() => {
                                    if (item.id) {
                                        router.navigate({
                                            to: '/notes/$id',
                                            params: { id: item.id.toString() },
                                        });
                                    }
                                }}
                            >
                                <span className='truncate'>
                                    {truncateText(
                                        parseMarkdownInline(
                                            (item.metadata as NoteMetadata)?.title ||
                                                '',
                                        ),
                                        64,
                                    )}
                                </span>
                            </div>
                        </PreviewTip>
                    );
                },
            },
            {
                accessorKey: 'description',
                id: 'description',
                meta: { label: 'Description' },
                header: 'Description',
                cell: ({ row }) => {
                    const item = row.original;
                    const meta = item.metadata as NoteMetadata;
                    return (
                        <div className='truncate max-w-xs'>
                            {meta?.description
                                ? parseMarkdownInline(meta.description ?? '')
                                : '-'}
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'author',
                id: 'author',
                meta: { label: 'Author' },
                header: ({ column }) => (
                    <div className='flex items-center gap-2'>
                        <DataTableColumnHeader column={column} label='Author' />
                        {filters.author && (
                            <span className='text-xs text-accent'>●</span>
                        )}
                    </div>
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='truncate w-32'>
                            {truncateText(item.author?.username || '', 16)}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'editor',
                id: 'editor',
                meta: { label: 'Editor' },
                header: ({ column }) => (
                    <div className='flex items-center gap-2'>
                        <DataTableColumnHeader column={column} label='Editor' />
                        {filters.editor && (
                            <span className='text-xs text-accent'>●</span>
                        )}
                    </div>
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='truncate w-32'>
                            {truncateText(item.editor?.username || '', 16)}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'timestamp',
                id: 'timestamp',
                meta: { label: 'Created At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-36'>
                            {item.timestamp
                                ? format(new Date(item.timestamp), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'edit_timestamp',
                id: 'edit_timestamp',
                meta: { label: 'Updated At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Updated At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-36'>
                            {item.edit_timestamp
                                ? format(
                                      new Date(item.edit_timestamp),
                                      'dd/MM/yyyy, HH:mm',
                                  )
                                : '-'}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: '',
                size: 40,
                minSize: 40,
                maxSize: 40,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div
                            className='text-right flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {item.id && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon-sm'
                                            className='text-muted-foreground hover:text-foreground'
                                            title='Actions'
                                        >
                                            <DotsThreeIcon
                                                className='w-4 h-4'
                                                weight='bold'
                                                aria-hidden='true'
                                            />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        {isAdmin && (
                                            <DropdownMenuItem onClick={confirmRelink}>
                                                <ArrowClockwiseIcon
                                                    size={16}
                                                    weight='bold'
                                                />
                                                Relink
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setReportNotes([
                                                    {
                                                        id: String(item.id),
                                                        title:
                                                            (
                                                                item.metadata as NoteMetadata
                                                            )?.title ||
                                                            item.title ||
                                                            'Untitled',
                                                    },
                                                ]);
                                                setIsReportOpen(true);
                                            }}
                                        >
                                            <ChartBarIcon size={16} weight='bold' />
                                            Report
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setEnrichNotes([
                                                    {
                                                        id: String(item.id),
                                                        title: ((
                                                            item.metadata as NoteMetadata
                                                        )?.title ||
                                                            item.title ||
                                                            'Untitled') as string,
                                                        entities: (item.entities ||
                                                            []) as OptimizedEntryResponse[],
                                                    },
                                                ]);
                                                setIsEnrichOpen(true);
                                            }}
                                        >
                                            <SparkleIcon size={16} weight='bold' />
                                            Enrich
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            variant='destructive'
                                            onClick={() => confirmDelete(item)}
                                        >
                                            <TrashIcon size={16} weight='bold' />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [
            filters,
            router,
            confirmRelink,
            setReportNotes,
            setIsReportOpen,
            setEnrichNotes,
            setIsEnrichOpen,
            confirmDelete,
            renderPreview,
            isAdmin,
        ],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
            columnPinning: {
                right: ['actions'],
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onSortingChange: applySorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = {
                pageIndex: page - 1,
                pageSize,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
    });

    const noteById = useMemo(() => {
        const map = new Map<string, NoteRow>();
        for (const item of rows) {
            if (item.id) {
                map.set(String(item.id), item);
            }
        }
        return map;
    }, [rows]);

    const report = useCallback(() => {
        if (checkedIds.length === 0) return;
        const items = checkedIds.map((id) => {
            const item = noteById.get(id);
            return {
                id,
                title:
                    (item?.metadata as NoteMetadata)?.title ||
                    item?.title ||
                    'Untitled',
            };
        });
        setReportNotes(items);
        setIsReportOpen(true);
    }, [noteById, checkedIds]);

    const enrich = useCallback(() => {
        if (checkedIds.length === 0) return;
        const items = checkedIds.map((id) => {
            const item = noteById.get(id);
            return {
                id,
                title: ((item?.metadata as NoteMetadata)?.title ||
                    item?.title ||
                    'Untitled') as string,
                entities: (item?.entities || []) as OptimizedEntryResponse[],
            };
        });
        setEnrichNotes(items);
        setIsEnrichOpen(true);
    }, [noteById, checkedIds]);

    return (
        <>
            <div ref={containerRef} className='flex flex-col space-y-4'>
                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                <div className='grid grid-cols-1 gap-2'>
                    <DataTable
                        table={table}
                        showViewOptions
                        isLoading={isLoading}
                        onRowClick={(item) =>
                            router.navigate({ to: `/notes/${item.id}` as any })
                        }
                        getRowHref={(item) => `/notes/${item.id}`}
                    >
                        <div className='flex items-center gap-2'>
                            {onCreateNote && hideActionBar && (
                                <ActionBarButton
                                    tooltip={
                                        <>
                                            Create new note{' '}
                                            <KbdGroup>
                                                <Kbd>Ctrl</Kbd>
                                                <Kbd>N</Kbd>
                                            </KbdGroup>
                                        </>
                                    }
                                    variant='circle'
                                    icon={<PlusCircleIcon width={18} height={18} />}
                                    iconActive={true}
                                    onClick={onCreateNote}
                                    disabled={isLoading}
                                />
                            )}
                            {contentSearch && (
                                <ActionBarSearch
                                    placeholder='Search content...'
                                    value={contentSearch.value || ''}
                                    debounceMs={300}
                                    onDebouncedChange={(v) => {
                                        contentSearch.onChange?.(v);
                                        contentSearch.onSubmit?.(v);
                                    }}
                                    onSubmit={(v) => {
                                        contentSearch.onChange?.(v);
                                        contentSearch.onSubmit?.(v);
                                    }}
                                    onClear={() => {
                                        contentSearch.onChange?.('');
                                        contentSearch.onSubmit?.('');
                                    }}
                                />
                            )}
                            <StatusHeaderDropdown
                                onStatusChange={updateStatus}
                                status={filters.status}
                                options={[
                                    'all',
                                    'fleeting',
                                    'healthy',
                                    'warning',
                                    'invalid',
                                    'processing',
                                ]}
                            />
                            <DateRangeFilterButton
                                title='Created At'
                                value={filters.timestamp}
                                onChange={(v) => applyFilter('timestamp', v)}
                            />
                            <DateRangeFilterButton
                                title='Updated At'
                                value={filters.edit_timestamp}
                                onChange={(v) => applyFilter('edit_timestamp', v)}
                            />
                        </div>
                    </DataTable>
                </div>
            </div>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) setRowSelection({});
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} note
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    {isAdmin && (
                        <ActionBarItem
                            onClick={confirmRelink}
                            disabled={isLoading || rows.length === 0}
                        >
                            <ArrowClockwiseIcon width={18} height={18} />
                            Relink
                        </ActionBarItem>
                    )}
                    <ActionBarItem
                        onClick={report}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <ChartBarIcon width={18} height={18} />
                        Report
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={enrich}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <SparkleIcon width={18} height={18} />
                        Enrich
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => confirmDelete()}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon width={18} height={18} />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm'>Clear</ActionBarClose>
            </ActionBar>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) setPendingDeleteIds([]);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {pendingDeleteIds.length}{' '}
                            note
                            {pendingDeleteIds.length > 1 ? 's' : ''}? This action is
                            irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={async () => {
                                if (pendingDeleteIds.length > 0) {
                                    await deleteNotes(pendingDeleteIds);
                                    setPendingDeleteIds([]);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <ReportGenerationDialog
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                notes={reportNotes}
            />
            <EnrichmentRequestDialog
                open={isEnrichOpen}
                onOpenChange={setIsEnrichOpen}
                notes={enrichNotes}
            />
            <AlertDialog open={isRelinkOpen} onOpenChange={setIsRelinkOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Relinking</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to relink all notes? This will
                            reprocess the relationships between notes and entities.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='default'
                            size='sm'
                            onClick={async () => {
                                try {
                                    await executeRelink();
                                    setIsRelinkOpen(false);
                                } catch (error) {
                                    const parsed = await parseAPIError(error);
                                    toast.error(getDisplayMessage(parsed));
                                }
                            }}
                        >
                            Relink
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
