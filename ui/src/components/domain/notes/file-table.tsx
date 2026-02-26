import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { ConfirmDeletionDialog } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FileReference } from '@/types';
import { createDownloadPath } from '@/utils/links';
import {
    ClipboardTextIcon,
    DownloadSimpleIcon,
    TextboxIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

const buildReferenceTag = (file: FileReference) =>
    file.id && file.file_name ? `${file.id}-${file.file_name}` : (file.id ?? '');

const buildMarkdownReference = (file: FileReference) => {
    const name = file.file_name ?? 'file';
    const tag = buildReferenceTag(file);
    return `[${name}][${tag}]`;
};
interface FileTableProps {
    fileData: FileReference[];
    setFileData: (data: FileReference[]) => void;
    insertTextCallback: (text: string) => void;
}

export default function FileTable({
    fileData,
    setFileData,
    insertTextCallback,
}: FileTableProps) {
    const basePath = import.meta.env.VITE_API_BASE_URL ?? '';
    const [deletingFile, setDeletingFile] = useState<FileReference | null>(null);

    const downloadMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/file-transfer/download/',
                { params: { query: { fileId } } },
            );
            if (error) throw { response };
            return data.presigned_url;
        },
        meta: {
            suppressNotification: true,
        },
    });

    const copyToClipboard = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
    }, []);

    // Removes a file from the table only. The file is not deleted from the server.
    const handleDelete = useCallback(
        (data: FileReference) => {
            setFileData(fileData.filter((d) => d.id !== data.id));
            try {
                const raw = localStorage.getItem('minio-cache');
                if (!raw) return;
                const minioCache = JSON.parse(raw) as Record<string, unknown>;
                delete minioCache[createDownloadPath(data, basePath)];
                localStorage.setItem('minio-cache', JSON.stringify(minioCache));
            } catch {
                // Ignore cache corruption / JSON parse errors
            }
        },
        [basePath, fileData, setFileData],
    );

    const { mutateAsync: downloadFile } = downloadMutation;
    const handleDownload = useCallback(
        async (data: FileReference) => {
            if (!data.id) return;
            const presignedUrl = await downloadFile(data.id);
            const link = document.createElement('a');
            link.href = presignedUrl;
            link.download = data.file_name || 'data';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        [downloadFile],
    );

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<FileReference>[]>(
        () => [
            {
                accessorKey: 'file_name',
                id: 'file_name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='File' />
                ),
                cell: ({ row }) => {
                    const data = row.original;
                    return (
                        <div className='text-foreground flex items-center'>
                            <span
                                className='truncate max-w-[200px]'
                                title={data.file_name ?? undefined}
                            >
                                {data.file_name}
                            </span>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                id: 'tag',
                accessorFn: (row) => buildReferenceTag(row),
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Reference Tag' />
                ),
                cell: ({ row }) => {
                    const data = row.original;
                    const tag = buildReferenceTag(data);
                    return (
                        <code
                            className='text-xs text-muted-foreground font-mono truncate max-w-[480px] block'
                            title={tag}
                        >
                            {tag}
                        </code>
                    );
                },
                enableSorting: false,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const data = row.original;
                    const reference = buildMarkdownReference(data);
                    return (
                        <div className='flex items-center justify-end gap-1'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        id={`insert-${row.index}`}
                                        data-testid={`insert-${row.index}`}
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-7 text-muted-foreground hover:text-foreground'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            insertTextCallback(reference);
                                        }}
                                    >
                                        <TextboxIcon className='size-4' weight='bold' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Insert into editor</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        id={`copy-${row.index}`}
                                        data-testid={`copy-${row.index}`}
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-7 text-muted-foreground hover:text-foreground'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(reference);
                                        }}
                                    >
                                        <ClipboardTextIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy reference</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        id={`download-${row.index}`}
                                        data-testid={`download-${row.index}`}
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-7 text-muted-foreground hover:text-foreground'
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleDownload(data);
                                        }}
                                    >
                                        <DownloadSimpleIcon
                                            className='size-4'
                                            weight='bold'
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        id={`delete-${row.index}`}
                                        data-testid={`delete-${row.index}`}
                                        variant='ghost'
                                        size='icon-sm'
                                        className='size-7 text-muted-foreground hover:text-destructive'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingFile(data);
                                        }}
                                    >
                                        <TrashIcon className='size-4' weight='bold' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove</TooltipContent>
                            </Tooltip>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [copyToClipboard, handleDownload, insertTextCallback],
    );

    const table = useReactTable({
        data: fileData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
    });

    return (
        <div className='w-full h-full text-sm [&_.rounded-md.border]:rounded-none [&_.rounded-md.border]:border-0'>
            {fileData.length === 0 ? (
                <p className='px-4 py-3 text-muted-foreground text-center'>
                    No files uploaded yet.
                </p>
            ) : (
                <DataTable table={table} showViewOptions />
            )}
            <ConfirmDeletionDialog
                open={Boolean(deletingFile)}
                onOpenChange={(open) => {
                    if (!open) setDeletingFile(null);
                }}
                text='Remove this file from the list?'
                onConfirm={() => {
                    if (!deletingFile) return;
                    handleDelete(deletingFile);
                    setDeletingFile(null);
                }}
            />
        </div>
    );
}
