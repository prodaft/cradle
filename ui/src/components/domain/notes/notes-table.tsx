import { ActionBarButton } from '@/components/base/action-bar-controls/action-bar-controls';
import PreviewTip from '@/components/base/preview/preview-tip';
import { SearchInput } from '@/components/base/search-input/search-input';
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
import { dayEndIso, dayStartIso } from '@/lib/search-query/dates';
import type { SearchState } from '@/lib/search-query/search-schema';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { parseMarkdownInline } from '@/utils/parser';
import {
    ArrowClockwiseIcon,
    ChartBarIcon,
    DotsThreeIcon,
    LockIcon,
    LockKeyOpenIcon,
    PlusCircleIcon,
    SparkleIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type CellContext,
    ColumnDef,
    type RowSelectionState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import startCase from 'lodash/startCase';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { StatusSlug } from './note-list-status';
import { NotePreviewContent } from './note-preview-content';
import {
    NOTES_SEARCH_SCHEMA,
    NOTES_SEARCH_SCHEMA_NO_FLEETING,
    orderByFromUrl,
} from './notes-list-search-schema';
import { useRequestNoteAccess } from './use-request-note-access';

type NoteListItem = components['schemas']['NoteListResponse'];
type NoteRow = Extract<NoteListItem, { accessible: true }>;
type NoteMetadata = { title?: string; description?: string };

const RESTRICTED_VISIBLE_COLUMNS = new Set(['created_at', 'updated_at']);

function RestrictedStatusBadge() {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Badge
                        variant='outline'
                        className='h-auto py-1 pl-1.5 [&>svg]:size-3.5! text-muted-foreground'
                    />
                }
            >
                <LockIcon />
                <span>Restricted</span>
            </TooltipTrigger>
            <TooltipContent>You don&apos;t have access to this note</TooltipContent>
        </Tooltip>
    );
}

function RestrictedNoteActions({ noteId }: { noteId: string }) {
    const requestAccess = useRequestNoteAccess();
    return (
        <div
            className='text-right flex justify-end'
            onClick={(e) => e.stopPropagation()}
        >
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            className='text-muted-foreground hover:text-foreground'
                            title='Actions'
                        />
                    }
                >
                    <DotsThreeIcon
                        className='w-4 h-4'
                        weight='bold'
                        aria-hidden='true'
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                        onClick={() => requestAccess.mutate(noteId)}
                        disabled={requestAccess.isPending || requestAccess.isSuccess}
                    >
                        <LockKeyOpenIcon size={16} weight='bold' />
                        {requestAccess.isSuccess
                            ? 'Access requested'
                            : 'Request access'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function CensoredValue() {
    return (
        <span
            role='img'
            aria-label='Hidden'
            title="Hidden: you don't have access to this note"
            className='inline-block h-3 w-20 rounded-sm bg-muted-foreground/25 align-middle'
        />
    );
}
type OptimizedEntryResponse = components['schemas']['OptimizedEntryResponse'];

type ListQuery = NonNullable<operations['notes_list']['parameters']['query']>;

/**
 * Props for `NotesTable`: fields sent to GET `/notes/` plus URL-scoped keys
 * not present on the generated `notes_list` operation (until OpenAPI is updated).
 */
export type NotesTableQueryInput = Partial<Omit<ListQuery, 'linked_to'>> & {
    linked_to?: number | string;
    linked_to_exact_match?: boolean;
    created_date_from?: string;
    created_date_to?: string;
    updated_date_from?: string;
    updated_date_to?: string;
};

interface SearchField {
    value: SearchState;
    onApply: (state: SearchState) => void;
}

interface NotesTableProps {
    scope: NotesTableQueryInput | null;
    hideFleetingNotes?: boolean;
    noteActions?: unknown[];
    hideActionBar?: boolean;
    references?: unknown;
    search?: SearchField | null;
    onCreateNote?: (() => void) | null;
    onCount?: ((count: { current: number; total: number }) => void) | null;
}

export default function NotesTable({
    scope,
    hideFleetingNotes = false,
    noteActions: _noteActions = [],
    hideActionBar = false,
    references: _references = null,
    search: searchField = null,
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
    const orderBy = orderByFromUrl(search ?? {});
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
    const [pendingRelinkIds, setPendingRelinkIds] = useState<string[]>([]);

    const relinkNote = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.POST(
                '/notes/{note_id}/relink/',
                { params: { path: { note_id: id } }, body: undefined },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiList() },
                { queryKey: queryKeys.notes.apiDetails() },
            ],
            suppressNotification: true,
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const pageSize = Number(search?.notes_pagesize ?? 20) || 20;
    const containerRef = useRef<HTMLDivElement>(null);

    const listQuery = useMemo((): ListQuery | null => {
        if (!scope) return null;

        const statuses = (scope.status ?? []).filter(
            (slug) => !hideFleetingNotes || slug !== 'fleeting',
        ) as StatusSlug[];
        const apiStatus: ListQuery['status'] | undefined = statuses.length
            ? statuses
            : hideFleetingNotes
              ? ['finalized']
              : undefined;

        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                order_by: orderBy,
                linked_to:
                    scope.linked_to != null ? String(scope.linked_to) : undefined,
                file: scope.file,
                status: apiStatus,
                any_field: scope.any_field,
                include_restricted: scope.any_field ? true : undefined,
                author: scope.author,
                editor: scope.editor,
                date: scope.date,
                references: scope.references,
                created_at_gte:
                    dayStartIso(scope.created_date_from) ?? scope.created_at_gte,
                created_at_lte:
                    dayEndIso(scope.created_date_to) ?? scope.created_at_lte,
                updated_at_gte:
                    dayStartIso(scope.updated_date_from) ?? scope.updated_at_gte,
                updated_at_lte:
                    dayEndIso(scope.updated_date_to) ?? scope.updated_at_lte,
                truncate: scope.truncate,
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [page, pageSize, scope, hideFleetingNotes, orderBy]);

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

    const relinkNotes = async (noteIds: string[]) => {
        const results = await Promise.allSettled(
            noteIds.map((id) => relinkNote.mutateAsync(id)),
        );

        const successes = results.filter((r) => r.status === 'fulfilled').length;
        const failures = results.filter((r) => r.status === 'rejected').length;

        if (failures === 0) {
            toast.success(
                `Successfully relinked ${successes} note${successes > 1 ? 's' : ''}`,
            );
        } else if (successes === 0) {
            const firstRejected = results.find(
                (r) => r.status === 'rejected',
            ) as PromiseRejectedResult;
            const parsed = await parseAPIError(firstRejected.reason);
            toast.error(getDisplayMessage(parsed));
        } else {
            toast.warning(
                `Relinked ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
            );
        }

        setRowSelection({});
    };

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

    const confirmRelink = useCallback(
        (item?: NoteRow) => {
            if (item?.id) {
                setPendingRelinkIds([String(item.id)]);
                setIsRelinkOpen(true);
                return;
            }
            if (checkedIds.length === 0) return;
            setPendingRelinkIds(checkedIds);
            setIsRelinkOpen(true);
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
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={
                            table.getIsSomePageRowsSelected() &&
                            !table.getIsAllPageRowsSelected()
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
                            <TooltipTrigger
                                render={
                                    <Badge
                                        variant='outline'
                                        className='h-auto py-1 pl-1.5 [&>svg]:size-3.5! capitalize'
                                    />
                                }
                            >
                                <StatusIcon status={status as StatusType} size={14} />
                                <span>{label}</span>
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
                    <DataTableColumnHeader column={column} label='Author' />
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
                    <DataTableColumnHeader column={column} label='Editor' />
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
                accessorKey: 'created_at',
                id: 'created_at',
                meta: { label: 'Created At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Created At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-36'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
                                : 'N/A'}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'updated_at',
                id: 'updated_at',
                meta: { label: 'Updated At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Updated At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-36'>
                            {item.updated_at
                                ? format(new Date(item.updated_at), 'dd/MM/yyyy, HH:mm')
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
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant='ghost'
                                                size='icon-sm'
                                                className='text-muted-foreground hover:text-foreground'
                                                title='Actions'
                                            />
                                        }
                                    >
                                        <DotsThreeIcon
                                            className='w-4 h-4'
                                            weight='bold'
                                            aria-hidden='true'
                                        />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        {isAdmin && (
                                            <DropdownMenuItem
                                                onClick={() => confirmRelink(item)}
                                            >
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

    const tableColumns = useMemo<ColumnDef<NoteListItem>[]>(
        () =>
            columns.map((column) => ({
                ...(column as unknown as ColumnDef<NoteListItem>),
                cell: (context: CellContext<NoteListItem, unknown>) => {
                    const columnId = column.id ?? '';
                    if (
                        context.row.original.accessible ||
                        RESTRICTED_VISIBLE_COLUMNS.has(columnId)
                    ) {
                        const noteContext = context as unknown as CellContext<
                            NoteRow,
                            unknown
                        >;
                        return column.cell
                            ? flexRender(column.cell, noteContext)
                            : context.renderValue();
                    }
                    if (columnId === 'status') return <RestrictedStatusBadge />;
                    if (columnId === 'actions') {
                        return (
                            <RestrictedNoteActions noteId={context.row.original.id} />
                        );
                    }
                    if (columnId === 'select') return null;
                    return <CensoredValue />;
                },
            })),
        [columns],
    );

    const table = useReactTable({
        data: rows,
        columns: tableColumns,
        state: {
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
        enableRowSelection: (row) => row.original.accessible,
        manualPagination: true,
        enableSorting: false,
        pageCount: totalPages,
        rowCount: notesData?.count,
    });

    const noteById = useMemo(() => {
        const map = new Map<string, NoteRow>();
        for (const item of rows) {
            if (item.accessible && item.id) {
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
                        <div className='flex min-w-0 flex-1 items-center gap-2'>
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
                            {searchField && (
                                <SearchInput
                                    schema={
                                        hideFleetingNotes
                                            ? NOTES_SEARCH_SCHEMA_NO_FLEETING
                                            : NOTES_SEARCH_SCHEMA
                                    }
                                    value={searchField.value}
                                    onApply={searchField.onApply}
                                    placeholder='Search notes...'
                                />
                            )}
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
                            onClick={() => confirmRelink()}
                            disabled={
                                isLoading ||
                                rows.length === 0 ||
                                checkedIds.length === 0
                            }
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
                            Are you sure you want to relink {pendingRelinkIds.length}{' '}
                            note{pendingRelinkIds.length > 1 ? 's' : ''}? This will
                            reprocess the relationships between{' '}
                            {pendingRelinkIds.length > 1 ? 'these notes' : 'this note'}{' '}
                            and entities.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='default'
                            size='sm'
                            onClick={() => relinkNotes(pendingRelinkIds)}
                        >
                            Relink
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
