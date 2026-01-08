import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDeletionModal } from '@/components/modals';
import { useModal } from '@/contexts';
import { toast } from 'sonner';
import { useAPICall, useCradleNavigate } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import { ActionBar, ActionBarSearch } from '@components/base/ActionBar/ActionBar';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import { Badge } from '@/components/ui/badge';
import { DataTable, type BulkAction } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import TableActionsButton from '@components/base/TableActionsButton';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useDroppable } from '@dnd-kit/core';
import type { FileDownload, FileReferenceWithNote } from '@services/cradle/models';
import bytes from 'bytes';
import { Download, RefreshCircle, Trash } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const { navigate, navigateLink } = useCradleNavigate();
    const [files, setFiles] = useState<FileReferenceWithNote[]>([]);
    const [alert, setInternalAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('files_page')) || 1);
    const [sortField, setSortField] = useState(
        searchParams.get('files_sort_field') || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (searchParams.get('files_sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('files_pagesize')) || 10,
    );
    const { execute } = useAPICall();
    const { setModal } = useModal();
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { notesApi, fileTransferApi } = useApi();
    const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning'>(
        'all',
    );

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

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
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', '1');
            if (sorting.length > 0) {
                const sort = sorting[0];
                const apiField = SORT_FIELD_MAPPING[sort.id] || sort.id;
                newParams.set('files_sort_field', apiField);
                newParams.set('files_sort_direction', sort.desc ? 'desc' : 'asc');
            }
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const fetchFiles = useCallback(async () => {
        setLoading(true);

        try {
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

            const response = await notesApi.notesFilesRetrieve(params);
            setFiles(response.results);
            setTotalPages(response.totalPages);
            if (onCountChange) {
                onCountChange({
                    current: response.results.length,
                    total: response.count || 0,
                });
            }
            setLoading(false);
        } catch (error) {
            if (onError) {
                onError(error);
            } else {
                toast.error('Failed to fetch files. Please try again.');
            }
            setLoading(false);
        }
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query,
        searchQuery,
        notesApi,
        onCountChange,
        onError,
    ]);

    const copyToClipboard = useCallback(
        (text: string) => {
            navigator.clipboard
                .writeText(text)
                .catch((error) => {
                    console.error('Failed to copy text: ', error);
                })
                .then(() => {
                    toast.success('Copied to clipboard');
                });
        },
        [],
    );

    const getFileStatus = useCallback(
        (file: FileReferenceWithNote): 'healthy' | 'warning' => {
            return file.sha256Hash ? 'healthy' : 'warning';
        },
        [],
    );

    // Download a single file
    const handleDownloadFile = useCallback(async (file: FileReferenceWithNote) => {
        if (!file.bucketName || !file.minioFileName) {
            toast.error('File download information is missing.');
            return;
        }

        try {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                bucketName: file.bucketName,
                minioFileName: file.minioFileName,
            });
        } catch (error) {
            console.error('Failed to download file: ', error);
            toast.error('Failed to download file. Please try again.');
        }
    }, [fileTransferApi]);

    // Download selected files
    const handleDownloadSelected = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        try {
            const downloads = await Promise.all(
                selectedFiles.map((fileId) => {
                    if (!fileId) return null;

                    return execute(() =>
                        fileTransferApi.fileTransferDownloadRetrieve({
                            fileId: fileId,
                        }),
                    );
                }),
            );
            downloads
                .filter((download): download is FileDownload => download !== null)
                .forEach(({ presignedUrl }, index) => {
                    window.open(presignedUrl, '_blank', 'noopener');
                });

            toast.info(`Attempted to download ${downloads.length} file(s). Your browser may block some.`);

        } catch (error) {
            console.error('Failed to download files: ', error);
            toast.error('Failed to download files. Please try again.');
        }
    }, [selectedFiles, files, fileTransferApi]);

    const handleReprocessSelected = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        const promises = selectedFiles.map((fileId) =>
            execute(() =>
                fileTransferApi.fileTransferProcessCreate({
                    fileProcessRequest: {
                        fileId: fileId,
                    },
                }),
            ),
        );

        await Promise.all(promises);
        toast.success(`Queued ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} for reprocessing`);
        setSelectedFiles([]);
    }, [selectedFiles, fileTransferApi, execute]);


    const deleteFiles = async (fileIds: string[]) => {
        let promises = selectedFiles.map((fileId) =>
            execute(() =>
                fileTransferApi.fileTransferDeleteDestroy({
                    fileId: fileId.toString(),
                }),
            ),
        );

        await Promise.all(promises);
        toast.success(`Deleted ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`);
        setSelectedFiles([]);
        fetchFiles();
    };

    const handleDeleteSelected = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        setModal(ConfirmDeletionModal, {
            text: `Are you sure you want to delete ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}?`,
            onConfirm: () => deleteFiles(selectedFiles),
        });

    }, [selectedFiles, files, notesApi, setModal]);

    const resetToFirstPage = useCallback(() => {
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('files_page', '1');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    // Memoize the files_page value to prevent unnecessary rerenders
    const filesPage = useMemo(() => searchParams.get('files_page'), [searchParams]);

    useEffect(() => {
        const pageFromParams = Number(filesPage) || 1;
        if (pageFromParams !== page) {
            setPage(pageFromParams);
        }
    }, [filesPage, page]);

    useEffect(() => {
        fetchFiles();
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query.date,
        query.keyword,
        query.linked_to,
        query.linked_to_exact_match,
        query.mimetype,
        query.references,
        query.timestamp_gte,
        query.timestamp_lte,
        searchQuery,
    ]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', String(newPage));
            setSearchParams(newParams);
        },
        [searchParams, setSearchParams],
    );

    // Filter files based on status and filteredFiles
    const filteredData = useMemo(() => {
        return files.filter((file) => {
            if (statusFilter !== 'all' && getFileStatus(file) !== statusFilter) return false;
            return !filteredFiles.some((f) => f.id === file.id);
        });
    }, [files, statusFilter, filteredFiles]);

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
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
                    <DataTableColumnHeader column={column} title="Name" />
                ),
                cell: ({ row }) => (
                    <div 
                        className='truncate w-32 cursor-pointer' 
                        onClick={navigateLink(`/notes/${row.original.noteId}`)}
                    >
                        <span className='truncate'>{truncateText(row.original.fileName, 32)}</span>
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
                                    navigate(
                                        `/dashboards/${entity.subtype || 'unknown'}/${encodeURIComponent(entity.name)}`,
                                    );
                                }}
                                title={`View ${entity.subtype || 'entity'}: ${entity.name}`}
                            >
                                <Badge 
                                    className={`rounded-full ${!entity.color ? 'bg-muted' : ''}`}
                                    style={entity.color ? { backgroundColor: entity.color } : undefined}
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
                    <DataTableColumnHeader column={column} title="MimeType" />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>{truncateText(row.original.mimetype, 32)}</div>
                ),
            },
            {
                accessorKey: 'fileSize',
                id: 'fileSize',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Size" />
                ),
                cell: ({ row }) => (
                    <div className='w-24'>
                        {row.original.fileSize != null
                            ? bytes.format(row.original.fileSize, { unitSeparator: ' ' })
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
                                <TooltipContent>
                                    Click to copy
                                </TooltipContent>
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
                    <DataTableColumnHeader column={column} title="Uploaded At" />
                ),
                cell: ({ row }) => (
                    <div className='w-32'>
                        {row.original.timestamp ? formatDate(row.original.timestamp) : '-'}
                    </div>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const file = row.original;
                    const handleDownload = () => {
                        handleDownloadFile(file);
                    };

                    const handleReprocess = async () => {
                        try {
                            await execute(() => fileTransferApi.fileTransferProcessCreate({
                                fileProcessRequest: {
                                    fileId: file.id!,
                                },
                            }));
                            toast.success('File queued for reprocessing');
                        } catch (error) {
                            console.error('Reprocess file failed:', error);
                            toast.error('Failed to reprocess file');
                        }
                    };

                    const handleDelete = () => {
                        setModal(ConfirmDeletionModal, {
                            text: `Are you sure you want to delete this file?`,
                            onConfirm: () => deleteFiles([file.id!]),
                        });
                    };

                    return (
                        <div className='w-12 text-right' onClick={(e) => e.stopPropagation()}>
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    <DropdownMenuItem onClick={handleDownload}>
                                        <Download width='18' height='18' />
                                        Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleReprocess}>
                                        <RefreshCircle width='18' height='18' />
                                        Reprocess
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} variant="destructive">
                                        <Trash width='18' height='18' />
                                        Delete
                                    </DropdownMenuItem>
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [copyToClipboard, navigate, navigateLink, handleDownloadFile, execute, fileTransferApi, setModal, deleteFiles],
    );

    // Convert sortField and sortDirection to TanStack Table sorting state
    const sorting = useMemo<SortingState>(() => {
        // Find the column id that matches the sortField
        const columnId = Object.keys(SORT_FIELD_MAPPING).find(
            (key) => SORT_FIELD_MAPPING[key] === sortField
        ) || sortField;
        
        return columnId ? [{
            id: columnId,
            desc: sortDirection === 'desc',
        }] : [];
    }, [sortField, sortDirection]);

    // Handle row selection
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedFiles(selectedIds);
    }, []);

    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            setPageSize(newSize);
            setPage(1);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', '1');
            newParams.set('files_pagesize', String(newSize));
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    return (
        <>
            <div className='flex flex-col space-y-4'>
                {alert.show && (
                    <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                        <WarningCircle />
                        <AlertDescription>{alert.message}</AlertDescription>
                    </AlertComponent>
                )}

                {/* Compact Control Bar - Actions and Pagination */}
                <ActionBar
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

                <div ref={setNodeRef} className='grid grid-cols-1 gap-2'>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        loading={loading}
                        emptyMessage='No files found!'
                        enableRowSelection={true}
                        selectedRows={selectedFiles}
                        onRowSelectionChange={handleRowSelectionChange}
                        sorting={sorting}
                        onSortingChange={handleSortingChange}
                        manualPagination={true}
                        manualSorting={true}
                        bulkActions={[
                            {
                                id: 'download',
                                label: 'Download files',
                                icon: <Download width={18} height={18} />,
                                onClick: handleDownloadSelected,
                                disabled: loading || files.length === 0 || selectedFiles.length === 0,
                            },
                            {
                                id: 'delete',
                                label: 'Delete files',
                                icon: <Trash width={18} height={18} />,
                                onClick: handleDeleteSelected,
                                disabled: loading || files.length === 0 || selectedFiles.length === 0,
                                variant: 'destructive',
                            },
                            {
                                id: 'reprocess',
                                label: 'Reprocess files',
                                icon: <RefreshCircle width={18} height={18} />,
                                onClick: handleReprocessSelected,
                                disabled: loading || files.length === 0 || selectedFiles.length === 0,
                            },
                        ]}
                        itemLabel="file"
                    />
                </div>

                <PaginationWrapper
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    disabled={files.length === 0}
                    selectedCount={selectedFiles.length}
                    totalRows={files.length}
                />
            </div>
        </>
    );
}
