import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
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
import { useCallback, useMemo } from 'react';

interface FilesViewProps {
    files: FileReferenceWithNote[];
    copyToClipboard: (text: string) => void;
}

type DownloadVars = { fileId: string; fileName?: string };

/**
 * Displays files attached to a note in a table/card view
 */
export default function FilesView({ files, copyToClipboard }: FilesViewProps) {
    const { fileTransferApi } = useApi();

    const downloadMutation = useMutation({
        mutationFn: async ({ fileId }: DownloadVars) => {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                fileId,
            });
            return response.presignedUrl;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (presignedUrl, vars) => {
            const link = document.createElement('a');
            link.href = presignedUrl;
            link.download = vars.fileName ?? 'data';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
    });

    const { mutate: downloadFile } = downloadMutation;

    const handleDownload = useCallback(
        (file: FileReferenceWithNote) => {
            if (!file.id) return;
            downloadFile({ fileId: file.id, fileName: file.fileName ?? undefined });
        },
        [downloadFile],
    );

    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
        () => [
            {
                accessorKey: 'fileName',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText((row.getValue('fileName') as string) ?? '-', 32)}
                    </div>
                ),
            },
            {
                accessorKey: 'entities',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Entities' />
                ),
                cell: ({ row }) => (
                    <div className='flex flex-wrap gap-1'>
                        {row.original.entities?.slice(0, 3).map((entity, idx) => (
                            <Badge
                                key={`${entity.name}-${idx}`}
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
                accessorKey: 'sha256Hash',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='SHA256' />
                ),
                cell: ({ row }) => {
                    const hash = row.original.sha256Hash;
                    if (!hash) return '-';

                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className='cursor-pointer hover:bg-muted px-1 rounded'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(hash);
                                    }}
                                >
                                    {hash.substring(0, 21)}...
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Click to copy</TooltipContent>
                        </Tooltip>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'timestamp',
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
                                    onClick={() => handleDownload(file)}
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
        data: files ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
    });

    if (!files || files.length === 0) return null;

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
