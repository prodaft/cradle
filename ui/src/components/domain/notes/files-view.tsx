import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateText } from '@/utils/dashboard';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useMemo } from 'react';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

interface FilesViewProps {
    files: FileReferenceWithNote[];
    copyToClipboard: (text: string) => void;
}

type DownloadVars = { fileId: string; fileName?: string };

export default function FilesView({ files, copyToClipboard }: FilesViewProps) {
    const { mutate: requestDownload, isPending: isDownloading } = useMutation({
        mutationFn: async ({ fileId }: DownloadVars) => {
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

    const download = useCallback(
        (file: FileReferenceWithNote) => {
            if (!file.id) return;
            requestDownload({
                fileId: file.id,
                fileName: file.name ?? undefined,
            });
        },
        [requestDownload],
    );

    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
        () => [
            {
                accessorKey: 'name',
                meta: { label: 'Name' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {truncateText((row.getValue('name') as string) ?? '-', 32)}
                    </div>
                ),
            },
            {
                accessorKey: 'entities',
                meta: { label: 'Entities' },
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
                accessorKey: 'mime_type',
                meta: { label: 'MimeType' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='MimeType' />
                ),
                cell: ({ row }) => (
                    <div className='truncate w-32'>
                        {row.original.mime_type
                            ? truncateText(row.original.mime_type, 32)
                            : '-'}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'sha256',
                meta: { label: 'SHA256' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='SHA256' />
                ),
                cell: ({ row }) => {
                    const hash = row.original.sha256;
                    if (!hash) return '-';

                    return (
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <span
                                        className='cursor-pointer hover:bg-muted px-1 rounded'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(hash);
                                        }}
                                    />
                                }
                            >
                                {hash.substring(0, 21)}...
                            </TooltipTrigger>
                            <TooltipContent>Click to copy</TooltipContent>
                        </Tooltip>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'created_at',
                meta: { label: 'Uploaded At' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Uploaded At' />
                ),
                cell: ({ row }) =>
                    row.original.created_at
                        ? format(new Date(row.original.created_at), 'dd/MM/yyyy, HH:mm')
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
                                    onClick={() => download(file)}
                                    disabled={isDownloading}
                                    className='text-primary hover:text-primary/80'
                                    title='Download'
                                    aria-label='Download'
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
        [copyToClipboard, download, isDownloading],
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
