import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { truncateText } from '@/utils/dashboard';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import type { FileReferenceWithNote } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface FilesViewProps {
    files: FileReferenceWithNote[];
    copyToClipboard: (text: string) => void;
}

/**
 * Displays files attached to a note in a table/card view
 */
export default function FilesView({ files, copyToClipboard }: FilesViewProps) {
    const { fileTransferApi } = useApi();

    const downloadMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                fileId,
            });
            return response.presignedUrl;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (presignedUrl, fileId) => {
            const file = files.find((f) => f.id === fileId);
            if (file) {
                const link = document.createElement('a');
                link.href = presignedUrl;
                const fileName = file?.fileName;
                link.download = fileName || 'data';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        },
    });

    if (!files || files.length === 0) {
        return null;
    }

    const handleDownload = async (file: FileReferenceWithNote) => {
        if (file.id) {
            downloadMutation.mutate(file.id);
        }
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
        () => [
            {
                accessorKey: 'name',
                id: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText(row.original.fileName, 32)}
                    </div>
                ),
            },
            {
                accessorKey: 'entities',
                id: 'entities',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Entities' />
                ),
                cell: ({ row }) => (
                    <div className='flex flex-wrap gap-1'>
                        {row.original.entities?.slice(0, 3).map((entity) => (
                            <Badge
                                key={entity.name}
                                variant={!entity.color ? 'secondary' : 'default'}
                                style={
                                    entity.color
                                        ? {
                                              backgroundColor: entity.color,
                                          }
                                        : undefined
                                }
                            >
                                {entity.name}
                            </Badge>
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
                        {row.original.mimetype
                            ? truncateText(row.original.mimetype, 32)
                            : '-'}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'sha256',
                id: 'sha256',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='SHA256' />
                ),
                cell: ({ row }) =>
                    row.original.sha256Hash ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className='cursor-pointer hover:bg-muted px-1 rounded'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(row.original.sha256Hash!);
                                    }}
                                >
                                    {row.original.sha256Hash.substring(0, 21)}...
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Click to copy</TooltipContent>
                        </Tooltip>
                    ) : (
                        '-'
                    ),
                enableSorting: false,
            },
            {
                accessorKey: 'uploadedAt',
                id: 'uploadedAt',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Uploaded At' />
                ),
                cell: ({ row }) =>
                    row.original.timestamp
                        ? format(new Date(row.original.timestamp), 'dd/MM/yyyy, HH:mm')
                        : 'N/A',
                enableSorting: false,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const file = row.original;
                    return (
                        <div
                            className='w-32 text-right flex justify-end space-x-1'
                            onClick={(e) => e.stopPropagation()}
                        >
                            {file.id && (
                                <Button
                                    variant='ghost'
                                    size='icon-sm'
                                    onClick={async () => await handleDownload(file)}
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
        [copyToClipboard, handleDownload],
    );

    const table = useReactTable({
        data: files,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
    });

    return (
        <ScrollArea className='w-full h-full'>
            <div className='flex items-start justify-center w-full min-h-full py-4 px-4'>
                <div className='w-full flex flex-col'>
                    <DataTable table={table} showViewOptions />
                </div>
            </div>
        </ScrollArea>
    );
}
