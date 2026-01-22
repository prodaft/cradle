import { Spinner } from '@/components/ui/spinner';
import { ConfirmDeletionModal } from '@/components/dialogs';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { ActionBar as BaseActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { useDroppable } from '@dnd-kit/core';
import type { FileReferenceWithNote } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { DownloadSimpleIcon, ArrowClockwiseIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OfflineIndicator from '../../feedback/OfflineIndicator';

interface FilesListQuery {
    date?: string;
    keyword?: string;
    linked_to?: number | string; // Entry ID (number) or string query parameter
    linked_to_exact_match?: boolean;
    mimetype?: string;
    references?: string;
    timestamp_gte?: string;
    timestamp_lte?: string;
}

/**
 * FilesList component - This component is used to display a list of files.
 * @param query - Query parameters for filtering files
 * @param filteredFiles - Files to filter out from the results
 * @param fileActions - Actions that can be performed on files
 * @param references - References for drag and drop functionality
 * @param setAlert - Function to set alerts (optional)
 * @param onError - Error handler function (optional)
 */
interface FilesListProps {
    query?: FilesListQuery;
    filteredFiles?: FileReferenceWithNote[];
    fileActions?: any[];
    references?: any;
    setAlert?: StateSetter<Alert> | null;
    onError?: ((error: any) => void) | null;
    onCountChange?: (count: { current: number; total: number }) => void;
}

// Mapping of table columns to API field names - moved outside component to prevent recreation
const SORT_FIELD_MAPPING: Record<string, string> = {
    name: 'file_name',
    uploadedAt: 'timestamp',
    mimetype: 'mimetype',
    fileSize: 'file_size',
};

// Empty defaults to prevent new object creation on each render
const EMPTY_QUERY = {};
const EMPTY_FILTERED_FILES: FileReferenceWithNote[] = [];
const EMPTY_FILE_ACTIONS: any[] = [];

export default function FilesList({
    query = EMPTY_QUERY,
    filteredFiles = EMPTY_FILTERED_FILES,
    fileActions = EMPTY_FILE_ACTIONS,
    references = null,
    setAlert: externalSetAlert = null,
    onError = null,
    onCountChange,
}: FilesListProps) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });

    const [alert, setInternalAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const [page, setPage] = useState((search as any)?.files_page || 1);
    const [sortField, setSortField] = useState(
        (search as any)?.files_sort_field || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (search as any)?.files_sort_direction || 'desc',
    );
    const [pageSize, setPageSize] = useState((search as any)?.files_pagesize || 10);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
    const [bulkDeleteFileIds, setBulkDeleteFileIds] = useState<string[]>([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

    const downloadFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const download = await fileTransferApi.fileTransferDownloadRetrieve({
                fileId,
            });
            return download.presignedUrl;
        },
        meta: {
            errorMessage: 'Failed to download file. Please try again.',
        },
        onSuccess: (presignedUrl) => {
            if (presignedUrl) {
                window.open(presignedUrl, '_blank', 'noopener');
            }
        },
    });

    const reprocessFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            await fileTransferApi.fileTransferProcessCreate({
                fileProcessRequest: {
                    fileId: fileId,
                },
            });
        },
        meta: {
            successMessage: 'File queued for reprocessing',
            errorMessage: 'Failed to reprocess file',
        },
    });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const { notesApi, fileTransferApi } = useApi();
    const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning'>(
        'all',
    );

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const selectedFileIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const handleSortingChange = useCallback(
        (sorting: SortingState) => {
            if (sorting.length === 0) {
                setSortField('timestamp');
                setSortDirection('desc');
            } else {
                const sort = sorting[0];
                const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                setSortField(apiField);
                setSortDirection(sort.desc ? 'desc' : 'asc');
            }

            // Reset to first page when sorting changes
            setPage(1);
            const newSearch: any = {
                ...(search as any),
                files_page: 1,
            };
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                newSearch.files_sort_field = apiField;
                newSearch.files_sort_direction = sort.desc ? 'desc' : 'asc';
            }
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        // Map snake_case to camelCase for the autogenerated API
        const params: any = {
            page,
            pageSize: pageSize,
            orderBy: orderBy,
            date: query.date,
            keyword: searchQuery || query.keyword,
            linkedTo: query.linked_to,
            linkedToExactMatch: query.linked_to_exact_match,
            mimetype: query.mimetype,
            references: query.references,
            timestampGte: query.timestamp_gte,
            timestampLte: query.timestamp_lte,
        };

        // Remove undefined values
        Object.keys(params).forEach(
            (key) => params[key] === undefined && delete params[key],
        );

        return params;
    }, [page, pageSize, sortField, sortDirection, query, searchQuery]);

    // Query for files
    const {
        data: filesData,
        isPending,
        isPaused,
        error: filesError,
    } = useQuery({
        queryKey: queryKeys.files.list({
            page,
            pageSize,
            query: queryParams,
        }),
        queryFn: () => notesApi.notesFilesRetrieve(queryParams),
        meta: {
            showErrorToast: false,
            suppressNotification: true, // We handle errors ourselves
        },
    });

    // Handle query errors (v5: onError removed from useQuery, use useEffect instead)
    useEffect(() => {
        if (filesError) {
            if (onError) {
                onError(filesError);
            } else {
                toast.error('Failed to fetch files. Please try again.');
            }
        }
    }, [filesError, onError]);

    const files = filesData?.results || [];
    const totalPages = filesData?.totalPages || 1;
    const loading = isPending && !isPaused;

    // Update count callback
    useEffect(() => {
        if (onCountChange && filesData) {
            onCountChange({
                current: files.length,
                total: filesData.count || 0,
            });
        }
    }, [files.length, filesData?.count, onCountChange]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard
            .writeText(text)
            .catch(() => {
                // Silently fail - user can try again
            })
            .then(() => {
                toast.success('Copied to clipboard');
            });
    }, []);

    const getFileStatus = useCallback(
        (file: FileReferenceWithNote): 'healthy' | 'warning' => {
            return file.sha256Hash ? 'healthy' : 'warning';
        },
        [],
    );

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
            const downloads = await Promise.all(
                selectedFileIds
                    .filter((fileId) => fileId)
                    .map((fileId) => downloadFileMutation.mutateAsync(fileId)),
            );
            downloads.forEach((presignedUrl) => {
                if (presignedUrl) {
                    window.open(presignedUrl, '_blank', 'noopener');
                }
            });

            toast.info(
                `Attempted to download ${downloads.length} file(s). Your browser may block some.`,
            );
        } catch (error) {
            toast.error('Failed to download files. Please try again.');
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
        } catch (error) {
            // Error handled by mutation
        }
    }, [selectedFileIds, reprocessFileMutation]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (fileId: string) =>
            fileTransferApi.fileTransferDeleteDestroy({
                fileId: fileId.toString(),
            }),
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
            toast.error('Failed to delete files');
        }
    };

    const handleDeleteSelected = useCallback(async () => {
        if (selectedFileIds.length === 0) return;
        setBulkDeleteFileIds(selectedFileIds);
        setBulkDeleteModalOpen(true);
    }, [selectedFileIds]);

    const resetToFirstPage = useCallback(() => {
        setPage(1);
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), files_page: 1 } as any,
            replace: true,
        });
    }, [router, location.pathname, search]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.files_page || 1;
        if (pageFromParams !== page) {
            setPage(pageFromParams);
        }
    }, [(search as any)?.files_page, page]);

    // Query automatically refetches when dependencies change
    // No manual useEffect needed

    const handlePageChange = useCallback(
        (newPage: number) => {
            const searchAny = search as any;
            const newSearch: any = { ...searchAny, files_page: newPage };
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
            });
        },
        [router, location.pathname, search],
    );

    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            setPageSize(newSize);
            setPage(1);
            const searchAny = search as any;
            const newSearch: any = {
                ...searchAny,
                files_page: 1,
                files_pagesize: newSize,
            };
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [router, location.pathname, search],
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

    // Filter files based on status and filteredFiles
    const filteredData = useMemo(() => {
        return files.filter((file) => {
            if (statusFilter !== 'all' && getFileStatus(file) !== statusFilter)
                return false;
            return !filteredFiles.some((f) => f.id === file.id);
        });
    }, [files, statusFilter, filteredFiles]);

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
                accessorKey: 'name',
                id: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div
                        className='truncate w-32 cursor-pointer'
                        onClick={(event) => {
                            event.stopPropagation();
                            router.navigate({
                                to: `/notes/${row.original.noteId}` as any,
                            });
                        }}
                    >
                        <span className='truncate'>
                            {truncateText(row.original.fileName, 32)}
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
                                            name: entity.name
                                        }
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
                accessorKey: 'fileSize',
                id: 'fileSize',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Size' />
                ),
                cell: ({ row }) => (
                    <div className='w-24'>
                        {row.original.fileSize != null
                            ? bytes.format(row.original.fileSize, {
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
                        {row.original.sha256Hash ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className='cursor-pointer hover:bg-muted px-1 rounded truncate block'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(row.original.sha256Hash!);
                                        }}
                                    >
                                        {row.original.sha256Hash!.substring(0, 48)}...
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
                accessorKey: 'uploadedAt',
                id: 'uploadedAt',
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
                cell: ({ row }) => {
                    const file = row.original;
                    return (
                        <div
                            className='text-right flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {file.id && (
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={() => handleDownloadFile(file)}
                                    className='text-primary hover:text-primary/80'
                                    title='Download'
                                >
                                    <DownloadSimpleIcon
                                        className='w-4 h-4'
                                        weight='bold'
                                        aria-hidden='true'
                                    />
                                </Button>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [copyToClipboard, router, handleDownloadFile],
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
        data: filteredData,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
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
        <>
            <div className='flex flex-col space-y-4'>
                {alert.show && (
                    <AlertComponent
                        variant={
                            alert.color === 'red' || alert.color === 'error'
                                ? 'destructive'
                                : 'default'
                        }
                    >
                        <WarningCircleIcon />
                        <AlertDescription>{alert.message}</AlertDescription>
                    </AlertComponent>
                )}

                {/* Compact Control Bar - Actions and Pagination */}
                <BaseActionBar
                    left={
                        <>
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
                        </>
                    }
                />

                {isPaused && (
                    <div className='mb-4'>
                        <OfflineIndicator />
                    </div>
                )}

                <div ref={setNodeRef} className='grid grid-cols-1 gap-2'>
                    {loading ? (
                        <div className='flex min-h-[200px] items-center justify-center'>
                            <Spinner />
                        </div>
                    ) : (
                        <DataTable table={table} />
                    )}
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
                        disabled={loading || files.length === 0 || selectedFileIds.length === 0}
                    >
                        <DownloadSimpleIcon size={18} weight="bold" />
                        Download
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleReprocessSelected}
                        disabled={loading || files.length === 0 || selectedFileIds.length === 0}
                    >
                        <ArrowClockwiseIcon size={18} weight="bold" />
                        Reprocess
                    </ActionBarItem>
                    <ActionBarItem
                        onClick={handleDeleteSelected}
                        disabled={loading || files.length === 0 || selectedFileIds.length === 0}
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight="bold" />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose
                    className='px-2 text-sm'
                    onClick={clearSelection}
                >
                    Clear
                </ActionBarClose>
            </ActionBar>
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={(open) => {
                    setBulkDeleteModalOpen(open);
                    if (!open) {
                        setBulkDeleteFileIds([]);
                    }
                }}
                text={`Are you sure you want to delete ${bulkDeleteFileIds.length} file${bulkDeleteFileIds.length > 1 ? 's' : ''}?`}
                onConfirm={() => {
                    deleteFiles(bulkDeleteFileIds);
                    setBulkDeleteFileIds([]);
                }}
            />
            {deletingFileId && (
                <ConfirmDeletionModal
                    open={deleteModalOpen}
                    onOpenChange={(open) => {
                        setDeleteModalOpen(open);
                        if (!open) setDeletingFileId(null);
                    }}
                    text='Are you sure you want to delete this file?'
                    onConfirm={() => {
                        if (deletingFileId) {
                            deleteFiles([deletingFileId]);
                        }
                    }}
                />
            )}
        </>
    );
}
