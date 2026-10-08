import { SearchInput } from '@/components/base/search-input/search-input';
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
import OfflineIndicator from '@/components/feedback/offline-indicator';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import type { SearchState } from '@/lib/search-query/search-schema';
import { cn } from '@/lib/utils';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import {
    createDashboardLink,
    FILE_DASHBOARD_SUBTYPE,
    truncateText,
} from '@/utils/dashboard';
import { useDroppable } from '@dnd-kit/core';
import {
    ArrowClockwiseIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    FileTextIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import bytes from 'bytes';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    FILES_SEARCH_SCHEMA,
    orderByFromUrl,
    searchStateFromUrl,
    urlFromSearchState,
} from './files-list-search-schema';
import { useFileDownload } from './use-file-download';

type FileRow = components['schemas']['FileReferenceWithNote'];

type ListQuery = NonNullable<operations['notes_files_retrieve']['parameters']['query']>;

type FilesListScopeQuery = Partial<Omit<ListQuery, 'linked_to' | 'references'>> & {
    linked_to?: number | string;
    references?: string;
};

interface FilesListProps {
    scope?: FilesListScopeQuery;
    hidePageHeader?: boolean;
}

const EMPTY_SCOPE: FilesListScopeQuery = {};
const EMPTY_ROWS: FileRow[] = [];

const fileDashboardLink = (item: FileRow) =>
    createDashboardLink({ subtype: FILE_DASHBOARD_SUBTYPE, name: item.id ?? '' });

export default function FilesList({
    scope = EMPTY_SCOPE,
    hidePageHeader = false,
}: FilesListProps) {
    useDockPanelTab({ title: 'Files', icon: 'files' }, !hidePageHeader);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.files_page ?? 1) || 1;
    const orderBy = orderByFromUrl(search ?? {});
    const searchState = useMemo(() => searchStateFromUrl(search ?? {}), [search]);
    const pageSize = Number(search?.files_pagesize ?? 20) || 20;
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

    const downloadFile = useFileDownload();

    const reprocessFile = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.POST(
                '/file-transfer/process/',
                { body: { file_id: id } },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'File queued for reprocessing',
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const listQuery = useMemo((): ListQuery => {
        return Object.fromEntries(
            Object.entries({
                page,
                page_size: pageSize,
                order_by: orderBy,
                date: scope.date,
                search: searchState.q || scope.search,
                linked_to:
                    scope.linked_to != null ? String(scope.linked_to) : undefined,
                mime_type: searchState.values.mimetype?.[0] || scope.mime_type,
                references: scope.references ? [scope.references] : undefined,
                status: searchState.values.status?.[0] ?? scope.status,
                created_at_gte: scope.created_at_gte,
                created_at_lte: scope.created_at_lte,
            }).filter(([, v]) => v !== undefined),
        ) as ListQuery;
    }, [page, pageSize, orderBy, scope, searchState]);

    const {
        data: filesPage,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/notes/files/',
        { params: { query: listQuery } },
        {
            meta: {
                showErrorToast: true,
            },
        },
    );

    const rows = filesPage?.results ?? EMPTY_ROWS;
    const totalPages = filesPage?.total_pages || 1;

    const checkedIds = useMemo(() => {
        const selectedIds: string[] = [];
        rows.forEach((item, idx) => {
            const key = String(item.id ?? idx);
            if (rowSelection[key] && item.id) selectedIds.push(String(item.id));
        });
        return selectedIds;
    }, [rows, rowSelection]);

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            // Silently fail - user can try again
        }
    }, []);

    const download = useCallback(
        (item: FileRow) => {
            if (!item.id) {
                toast.error('File download information is missing.');
                return;
            }
            downloadFile.mutate(item.id);
        },
        [downloadFile],
    );

    const reprocess = useCallback(
        (item: FileRow) => {
            if (!item.id) return;
            reprocessFile.mutate(item.id);
        },
        [reprocessFile],
    );

    const downloadAll = useCallback(async () => {
        if (checkedIds.length === 0) return;

        try {
            await Promise.all(
                checkedIds.filter((id) => id).map((id) => downloadFile.mutateAsync(id)),
            );
            toast.info(
                `Attempted to download ${checkedIds.length} file(s). Your browser may block some.`,
            );
        } catch {
            // Error toast shown by global mutation handler
        }
    }, [checkedIds, downloadFile]);

    const reprocessAll = useCallback(async () => {
        if (checkedIds.length === 0) return;

        try {
            await Promise.all(checkedIds.map((id) => reprocessFile.mutateAsync(id)));
            toast.success(
                `Queued ${checkedIds.length} file${checkedIds.length > 1 ? 's' : ''} for reprocessing`,
            );
            setRowSelection({});
        } catch (_error) {
            // Error handled by mutation
        }
    }, [checkedIds, reprocessFile]);

    const deleteFile = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/file-transfer/delete/',
                {
                    params: {
                        query: {
                            file_id: id,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.files.apiList() },
                { queryKey: queryKeys.files.apiDetails() },
                { queryKey: queryKeys.notes.apiDetails() },
            ],
            suppressNotification: true,
        },
    });

    const deleteFiles = async (fileIds: string[]) => {
        try {
            await Promise.all(fileIds.map((id) => deleteFile.mutateAsync(id)));
            toast.success(
                `Deleted ${fileIds.length} file${fileIds.length > 1 ? 's' : ''}`,
            );
            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    const confirmDelete = useCallback(
        (item?: FileRow) => {
            if (item?.id) {
                setPendingDeleteIds([item.id]);
                setIsDeleteOpen(true);
                return;
            }
            if (checkedIds.length === 0) return;
            setPendingDeleteIds(checkedIds);
            setIsDeleteOpen(true);
        },
        [checkedIds],
    );

    const goTo = useCallback(
        (target: number) => {
            router.navigate({
                to: location.pathname as any,
                search: ((prev: any) => ({ ...prev, files_page: target })) as any,
                replace: true,
            });
        },
        [router, location.pathname],
    );

    const applySearch = useCallback(
        (state: SearchState) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    ...urlFromSearchState(state),
                    files_page: 1,
                } as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const changePageSize = useCallback(
        (size: number) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    files_page: 1,
                    files_pagesize: size,
                } as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;

            if (size !== pageSize) {
                changePageSize(size);
            } else if (target !== page) {
                goTo(target);
            }
        },
        [page, pageSize, goTo, changePageSize],
    );

    const columns = useMemo<ColumnDef<FileRow>[]>(
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
                accessorKey: 'name',
                id: 'name',
                meta: { label: 'Name' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='truncate w-32'>
                            <span className='truncate'>
                                {truncateText(item.name, 32)}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'entities',
                id: 'entities',
                meta: { label: 'Entities' },
                header: 'Entities',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='flex flex-wrap gap-1'>
                            {item.entities?.slice(0, 3).map((entity) => (
                                <div
                                    key={entity.name}
                                    className='cursor-pointer'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.navigate({
                                            to: '/dashboards/$subtype/$name',
                                            params: {
                                                subtype: entity.subtype || 'unknown',
                                                name: entity.name,
                                            },
                                        });
                                    }}
                                    title={`View ${entity.subtype || 'entity'}: ${entity.name}`}
                                >
                                    <Badge
                                        className={`rounded-full ${!entity.color ? 'bg-muted' : ''}`}
                                        style={
                                            entity.color
                                                ? { backgroundColor: entity.color }
                                                : undefined
                                        }
                                    >
                                        {entity.name}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'mime_type',
                id: 'mime_type',
                meta: { label: 'MimeType' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='MimeType' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='truncate w-32'>
                            {truncateText(item.mime_type, 32)}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'size',
                id: 'size',
                meta: { label: 'Size' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Size' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-24'>
                            {item.size != null
                                ? bytes.format(item.size, {
                                      unitSeparator: ' ',
                                  })
                                : '-'}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'sha256',
                id: 'sha256',
                meta: { label: 'SHA256' },
                header: 'SHA256',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-48'>
                            {item.sha256 ? (
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <span
                                                className='cursor-pointer hover:bg-muted px-1 rounded truncate block'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(item.sha256!);
                                                }}
                                            />
                                        }
                                    >
                                        {item.sha256!.substring(0, 48)}...
                                    </TooltipTrigger>
                                    <TooltipContent>Click to copy</TooltipContent>
                                </Tooltip>
                            ) : (
                                '-'
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'created_at',
                id: 'created_at',
                meta: { label: 'Uploaded At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Uploaded At' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='w-32'>
                            {item.created_at
                                ? format(new Date(item.created_at), 'dd/MM/yyyy, HH:mm')
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
                                        {item.note_id && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.navigate({
                                                        to: '/notes/$id',
                                                        params: { id: item.note_id! },
                                                    })
                                                }
                                            >
                                                <FileTextIcon size={16} weight='bold' />
                                                Open note
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            onClick={() => download(item)}
                                        >
                                            <DownloadSimpleIcon
                                                size={16}
                                                weight='bold'
                                            />
                                            Download
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => reprocess(item)}
                                        >
                                            <ArrowClockwiseIcon
                                                size={16}
                                                weight='bold'
                                            />
                                            Reprocess
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
        [copyToClipboard, router, download, reprocess, confirmDelete],
    );

    const table = useReactTable({
        data: rows,
        columns,
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
        enableRowSelection: true,
        manualPagination: true,
        enableSorting: false,
        pageCount: totalPages,
        rowCount: filesPage?.count,
    });

    return (
        <div className='w-full h-full flex flex-col space-y-4'>
            {!hidePageHeader && (
                <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                    <div className='space-y-1'>
                        <h2 className='text-2xl font-bold tracking-tight'>Files</h2>
                        <p className='text-muted-foreground'>Browse & Manage Files</p>
                    </div>
                </div>
            )}
            <div className={cn('flex flex-col space-y-4', !hidePageHeader && 'px-4')}>
                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                <div ref={setNodeRef} className='grid grid-cols-1 gap-2'>
                    <DataTable
                        table={table}
                        showViewOptions
                        isLoading={isLoading}
                        onRowClick={(item) =>
                            router.navigate({ to: fileDashboardLink(item) as any })
                        }
                        getRowHref={fileDashboardLink}
                    >
                        <SearchInput
                            schema={FILES_SEARCH_SCHEMA}
                            value={searchState}
                            onApply={applySearch}
                            placeholder='Search files...'
                        />
                    </DataTable>
                </div>
            </div>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} file
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={downloadAll}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <DownloadSimpleIcon size={18} weight='bold' />
                        Download
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={reprocessAll}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                    >
                        <ArrowClockwiseIcon size={18} weight='bold' />
                        Reprocess
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={() => confirmDelete()}
                        disabled={
                            isLoading || rows.length === 0 || checkedIds.length === 0
                        }
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
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
                            file
                            {pendingDeleteIds.length > 1 ? 's' : ''}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                deleteFiles(pendingDeleteIds);
                                setPendingDeleteIds([]);
                                setIsDeleteOpen(false);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
