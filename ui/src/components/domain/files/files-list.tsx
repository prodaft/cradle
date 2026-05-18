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
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { truncateText } from '@/utils/dashboard';
import { ActionBarSearch } from '@components/base/action-bar/action-bar';
import { useDroppable } from '@dnd-kit/core';
import {
    ArrowClockwiseIcon,
    DotsThreeIcon,
    DownloadSimpleIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components, operations } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import bytes from 'bytes';
import { format } from 'date-fns';
import { Check, PlusCircle, XCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OfflineIndicator from '../../feedback/offline-indicator';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

type FilesListQuery = NonNullable<
    operations['notes_files_retrieve']['parameters']['query']
>;

export type FilesListScopeQuery = Partial<
    Omit<FilesListQuery, 'linked_to' | 'references'>
> & {
    linked_to?: number | string;
    references?: string;
};

interface FilesListProps {
    query?: FilesListScopeQuery;
    hidePageHeader?: boolean;
}

// Mapping of table columns to API field names - moved outside component to prevent recreation
const SORT_FIELD_MAPPING: Record<string, string> = {
    file_name: 'file_name',
    timestamp: 'timestamp',
    mimetype: 'mimetype',
    file_size: 'file_size',
};

// Empty defaults to prevent new object creation on each render
const EMPTY_QUERY: FilesListScopeQuery = {};
const EMPTY_FILES: FileReferenceWithNote[] = [];

export default function FilesList({
    query = EMPTY_QUERY,
    hidePageHeader = false,
}: FilesListProps) {
    useDockPanelTab({ title: 'Files', icon: 'files' }, !hidePageHeader);
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });

    const searchAny = search as any;
    const page = Number(searchAny?.files_page ?? 1) || 1;
    const sortField = (searchAny?.files_sort_field ?? 'timestamp') as string;
    const sortDirection: 'asc' | 'desc' = (searchAny?.files_sort_direction ??
        'desc') as 'asc' | 'desc';
    const pageSize = Number(searchAny?.files_pagesize ?? 20) || 20;
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteFileIds, setBulkDeleteFileIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

    const downloadFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/file-transfer/download/',
                {
                    params: {
                        query: {
                            file_id: fileId,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data.presigned_url;
        },
        onSuccess: (presignedUrl) => {
            if (presignedUrl) {
                window.open(presignedUrl, '_blank', 'noopener');
            }
        },
    });

    const reprocessFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const { error, response } = await fetchClient.POST(
                '/file-transfer/process/',
                { body: { file_id: fileId } },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'File queued for reprocessing',
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const statusFilter: 'all' | 'healthy' | 'warning' =
        (searchAny?.files_status as 'all' | 'healthy' | 'warning') || 'all';

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            const newSearch: any = { ...searchAny, files_page: 1 };

            if (sorting.length === 0) {
                delete newSearch.files_sort_field;
                delete newSearch.files_sort_direction;
            } else {
                const sort = sorting[0];
                if (!sort) {
                    delete newSearch.files_sort_field;
                    delete newSearch.files_sort_direction;
                } else {
                    const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                    newSearch.files_sort_field = apiField;
                    newSearch.files_sort_direction = sort.desc ? 'desc' : 'asc';
                }
            }

            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    // Prepare query parameters
    const queryParams = useMemo((): FilesListQuery => {
        const order_by = sortDirection === 'desc' ? `-${sortField}` : sortField;

        const params: FilesListQuery = {
            page,
            page_size: pageSize,
            order_by,
            date: query.date,
            keyword: searchQuery || query.keyword,
            linked_to: query.linked_to != null ? String(query.linked_to) : undefined,
            mimetype: query.mimetype,
            references: query.references ? [query.references] : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            timestamp_gte: query.timestamp_gte,
            timestamp_lte: query.timestamp_lte,
        };

        return Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined),
        ) as FilesListQuery;
    }, [page, pageSize, sortField, sortDirection, query, searchQuery, statusFilter]);

    // Query for files
    const {
        data: filesData,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/notes/files/',
        { params: { query: queryParams } },
        {
            meta: {
                showErrorToast: true,
            },
        },
    );

    const files = filesData?.results ?? EMPTY_FILES;
    const totalPages = filesData?.total_pages || 1;

    const selectedFileIds = useMemo(() => {
        const ids: string[] = [];
        files.forEach((f, idx) => {
            const rowId = String(f.id ?? idx);
            if (rowSelection[rowId] && f.id) ids.push(String(f.id));
        });
        return ids;
    }, [files, rowSelection]);

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            // Silently fail - user can try again
        }
    }, []);

    // Download a single file
    const handleDownloadFile = useCallback(
        (file: FileReferenceWithNote) => {
            if (!file.id) {
                toast.error('File download information is missing.');
                return;
            }
            downloadFileMutation.mutate(file.id);
        },
        [downloadFileMutation],
    );

    // Download selected files
    const handleDownloadSelected = useCallback(async () => {
        if (selectedFileIds.length === 0) return;

        try {
            await Promise.all(
                selectedFileIds
                    .filter((fileId) => fileId)
                    .map((fileId) => downloadFileMutation.mutateAsync(fileId)),
            );
            toast.info(
                `Attempted to download ${selectedFileIds.length} file(s). Your browser may block some.`,
            );
        } catch {
            // Error toast shown by global mutation handler
        }
    }, [selectedFileIds, downloadFileMutation]);

    const handleReprocessSelected = useCallback(async () => {
        if (selectedFileIds.length === 0) return;

        try {
            await Promise.all(
                selectedFileIds.map((fileId) =>
                    reprocessFileMutation.mutateAsync(fileId),
                ),
            );
            toast.success(
                `Queued ${selectedFileIds.length} file${selectedFileIds.length > 1 ? 's' : ''} for reprocessing`,
            );
            setRowSelection({});
        } catch (_error) {
            // Error handled by mutation
        }
    }, [selectedFileIds, reprocessFileMutation]);

    const deleteMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/file-transfer/delete/',
                {
                    params: {
                        query: {
                            file_id: fileId,
                        },
                    },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.files.lists() }],
            suppressNotification: true,
        },
    });

    const deleteFiles = async (fileIds: string[]) => {
        try {
            await Promise.all(
                fileIds.map((fileId) => deleteMutation.mutateAsync(fileId)),
            );
            toast.success(
                `Deleted ${fileIds.length} file${fileIds.length > 1 ? 's' : ''}`,
            );
            setRowSelection({});
        } catch (error) {
            const parsed = await parseAPIError(error);
            toast.error(getDisplayMessage(parsed));
        }
    };

    const handleDeleteSelected = useCallback(async () => {
        if (selectedFileIds.length === 0) return;
        setBulkDeleteFileIds(selectedFileIds);
        setBulkDeleteDialogOpen(true);
    }, [selectedFileIds]);

    const resetToFirstPage = useCallback(() => {
        router.navigate({
            to: location.pathname as any,
            search: { ...searchAny, files_page: 1 } as any,
            replace: true,
        });
    }, [router, location.pathname, searchAny]);

    const handleStatusFilterChange = useCallback(
        (value: string) => {
            const next = (value || 'all') as 'all' | 'healthy' | 'warning';
            const nextSearch: any = { ...searchAny, files_page: 1 };
            if (next === 'all') {
                delete nextSearch.files_status;
            } else {
                nextSearch.files_status = next;
            }
            router.navigate({
                to: location.pathname as any,
                search: nextSearch as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...searchAny, files_page: newPage } as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...searchAny,
                    files_page: 1,
                    files_pagesize: newSize,
                } as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                handlePageSizeChange(newPageSize);
            }
            // Handle page change
            else if (newPage !== page) {
                handlePageChange(newPage);
            }
        },
        [page, pageSize, handlePageChange, handlePageSizeChange],
    );

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
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
                accessorKey: 'file_name',
                id: 'file_name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div
                        className='truncate w-32 cursor-pointer'
                        onClick={(event) => {
                            event.stopPropagation();
                            router.navigate({
                                to: `/notes/${row.original.note_id}` as any,
                            });
                        }}
                    >
                        <span className='truncate'>
                            {truncateText(row.original.file_name, 32)}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: 'entities',
                id: 'entities',
                header: 'Entities',
                cell: ({ row }) => (
                    <div className='flex flex-wrap gap-1'>
                        {row.original.entities?.slice(0, 3).map((entity) => (
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
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'mimetype',
                id: 'mimetype',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='MimeType' />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText(row.original.mimetype, 32)}
                    </div>
                ),
            },
            {
                accessorKey: 'file_size',
                id: 'file_size',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Size' />
                ),
                cell: ({ row }) => (
                    <div className='w-24'>
                        {row.original.file_size != null
                            ? bytes.format(row.original.file_size, {
                                  unitSeparator: ' ',
                              })
                            : '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'sha256',
                id: 'sha256',
                header: 'SHA256',
                cell: ({ row }) => (
                    <div className='w-48'>
                        {row.original.sha256_hash ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className='cursor-pointer hover:bg-muted px-1 rounded truncate block'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(row.original.sha256_hash!);
                                        }}
                                    >
                                        {row.original.sha256_hash!.substring(0, 48)}...
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>Click to copy</TooltipContent>
                            </Tooltip>
                        ) : (
                            '-'
                        )}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'timestamp',
                id: 'timestamp',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Uploaded At' />
                ),
                cell: ({ row }) => (
                    <div className='w-32'>
                        {row.original.timestamp
                            ? format(
                                  new Date(row.original.timestamp),
                                  'dd/MM/yyyy, HH:mm',
                              )
                            : '-'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                size: 40,
                minSize: 40,
                maxSize: 40,
                cell: ({ row }) => {
                    const file = row.original;
                    return (
                        <div
                            className='text-right flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {file.id && (
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
                                        <DropdownMenuItem
                                            onClick={() => handleDownloadFile(file)}
                                        >
                                            <DownloadSimpleIcon
                                                size={16}
                                                weight='bold'
                                            />
                                            Download
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                reprocessFileMutation.mutate(file.id!)
                                            }
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
                                            onClick={() => {
                                                setDeletingFileId(file.id!);
                                                setDeleteDialogOpen(true);
                                            }}
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
            copyToClipboard,
            router,
            handleDownloadFile,
            reprocessFileMutation,
            setDeletingFileId,
            setDeleteDialogOpen,
        ],
    );

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        // Find the column id that matches the sortField
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

    const onTableSortingChange = useCallback(
        (updater: SortingState | ((prev: SortingState) => SortingState)) => {
            const nextSorting =
                typeof updater === 'function' ? updater(sorting) : updater;
            handleSortingChange(nextSorting);
        },
        [handleSortingChange, sorting],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const table = useReactTable({
        data: files,
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
        onSortingChange: onTableSortingChange,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const currentPagination = {
                pageIndex: page - 1,
                pageSize,
            };
            const nextPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;
            handlePaginationChange(nextPagination.pageIndex, nextPagination.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        manualSorting: true,
        pageCount: totalPages,
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
                    <DataTable table={table} showViewOptions isLoading={isLoading}>
                        <ActionBarSearch
                            placeholder='Search files...'
                            debounceMs={300}
                            onDebouncedChange={(v) => {
                                setSearchQuery(v);
                                resetToFirstPage();
                            }}
                            onSubmit={() => resetToFirstPage()}
                            onClear={() => resetToFirstPage()}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='border-dashed font-normal'
                                >
                                    {statusFilter !== 'all' ? (
                                        <div
                                            role='button'
                                            aria-label='Clear status filter'
                                            tabIndex={0}
                                            className='rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStatusFilterChange('all');
                                            }}
                                        >
                                            <XCircle />
                                        </div>
                                    ) : (
                                        <PlusCircle />
                                    )}
                                    Status
                                    {statusFilter !== 'all' && (
                                        <>
                                            <Separator
                                                orientation='vertical'
                                                className='mx-0.5 data-[orientation=vertical]:h-4'
                                            />
                                            <Badge
                                                variant='secondary'
                                                className='rounded-sm px-1 font-normal'
                                            >
                                                {statusFilter === 'healthy'
                                                    ? 'Healthy'
                                                    : 'Warning'}
                                            </Badge>
                                        </>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-50 p-0' align='start'>
                                <Command>
                                    <CommandList className='max-h-full'>
                                        <ScrollArea className='max-h-[300px]'>
                                            <CommandGroup className='scroll-py-1'>
                                                {(
                                                    [
                                                        {
                                                            value: 'healthy',
                                                            label: 'Healthy',
                                                        },
                                                        {
                                                            value: 'warning',
                                                            label: 'Warning',
                                                        },
                                                    ] as const
                                                ).map((option) => {
                                                    const isSelected =
                                                        statusFilter === option.value;
                                                    return (
                                                        <CommandItem
                                                            key={option.value}
                                                            onSelect={() =>
                                                                handleStatusFilterChange(
                                                                    isSelected
                                                                        ? 'all'
                                                                        : option.value,
                                                                )
                                                            }
                                                        >
                                                            <div
                                                                className={cn(
                                                                    'flex size-4 items-center justify-center rounded-sm border border-primary',
                                                                    isSelected
                                                                        ? 'bg-primary'
                                                                        : 'opacity-50 [&_svg]:invisible',
                                                                )}
                                                            >
                                                                <Check />
                                                            </div>
                                                            <span className='truncate'>
                                                                {option.label}
                                                            </span>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </ScrollArea>
                                        {statusFilter !== 'all' && (
                                            <>
                                                <CommandSeparator />
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() =>
                                                            handleStatusFilterChange(
                                                                'all',
                                                            )
                                                        }
                                                        className='justify-center text-center'
                                                    >
                                                        Clear filters
                                                    </CommandItem>
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </DataTable>
                </div>
            </div>
            <ActionBar
                open={selectedFileIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedFileIds.length} file
                    {selectedFileIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleDownloadSelected}
                        disabled={
                            isLoading ||
                            files.length === 0 ||
                            selectedFileIds.length === 0
                        }
                    >
                        <DownloadSimpleIcon size={18} weight='bold' />
                        Download
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleReprocessSelected}
                        disabled={
                            isLoading ||
                            files.length === 0 ||
                            selectedFileIds.length === 0
                        }
                    >
                        <ArrowClockwiseIcon size={18} weight='bold' />
                        Reprocess
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleDeleteSelected}
                        disabled={
                            isLoading ||
                            files.length === 0 ||
                            selectedFileIds.length === 0
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
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) setBulkDeleteFileIds([]);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {bulkDeleteFileIds.length}{' '}
                            file
                            {bulkDeleteFileIds.length > 1 ? 's' : ''}?
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
                                deleteFiles(bulkDeleteFileIds);
                                setBulkDeleteFileIds([]);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {deletingFileId && (
                <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (!open) setDeletingFileId(null);
                    }}
                >
                    <AlertDialogContent className='sm:max-w-md'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this file?
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
                                    if (deletingFileId) deleteFiles([deletingFileId]);
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
