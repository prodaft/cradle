import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys } from '@/hooks/query/query-keys';
import type { FileReferenceWithNote } from '@/types/models';
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

const buildReferenceTag = (file: FileReferenceWithNote) =>
    file.id && file.name ? `${file.id}-${file.name}` : (file.id ?? '');

const buildMarkdownReference = (file: FileReferenceWithNote) => {
    const name = file.name ?? 'file';
    const tag = buildReferenceTag(file);
    return `[${name}][${tag}]`;
};
interface FileTableProps {
    files: FileReferenceWithNote[];
    setFiles: (data: FileReferenceWithNote[]) => void;
    insertTextCallback: (text: string) => void;
    canRemove?: boolean;
}

export default function FileTable({
    files,
    setFiles,
    insertTextCallback,
    canRemove = true,
}: FileTableProps) {
    const [pendingRemoveFile, setPendingRemoveFile] =
        useState<FileReferenceWithNote | null>(null);

    const { mutateAsync: fetchDownloadUrl } = useMutation({
        mutationFn: async (id: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/file-transfer/download/',
                {
                    params: {
                        query: {
                            file_id: id,
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
    });

    const copyToClipboard = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
    }, []);

    const { mutate: deleteFile } = useMutation({
        mutationFn: async (id: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/file-transfer/delete/',
                { params: { query: { file_id: id } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetails() },
                { queryKey: queryKeys.files.apiList() },
                { queryKey: queryKeys.files.apiDetails() },
            ],
            successMessage: 'File deleted.',
        },
    });

    const removeFile = useCallback(
        (row: FileReferenceWithNote) => {
            if (!row.id) return;
            deleteFile(row.id, {
                onSuccess: () => setFiles(files.filter((d) => d.id !== row.id)),
            });
        },
        [deleteFile, files, setFiles],
    );

    const download = useCallback(
        async (item: FileReferenceWithNote) => {
            if (!item.id) return;
            const presignedUrl = await fetchDownloadUrl(item.id);
            const link = document.createElement('a');
            link.href = presignedUrl;
            link.download = item.name || 'data';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        [fetchDownloadUrl],
    );

    const columns = useMemo<ColumnDef<FileReferenceWithNote>[]>(
        () => [
            {
                accessorKey: 'name',
                id: 'name',
                meta: { label: 'File' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='File' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='text-foreground flex items-center'>
                            <span
                                className='truncate max-w-[200px]'
                                title={item.name ?? undefined}
                            >
                                {item.name}
                            </span>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                id: 'tag',
                meta: { label: 'Reference Tag' },
                accessorFn: (row) => buildReferenceTag(row),
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Reference Tag' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    const tag = buildReferenceTag(item);
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
                    const item = row.original;
                    const reference = buildMarkdownReference(item);
                    return (
                        <div className='flex items-center justify-end gap-1'>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
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
                                        />
                                    }
                                >
                                    <TextboxIcon className='size-4' weight='bold' />
                                </TooltipTrigger>
                                <TooltipContent>Insert into editor</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
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
                                        />
                                    }
                                >
                                    <ClipboardTextIcon
                                        className='size-4'
                                        weight='bold'
                                    />
                                </TooltipTrigger>
                                <TooltipContent>Copy reference</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            id={`download-${row.index}`}
                                            data-testid={`download-${row.index}`}
                                            variant='ghost'
                                            size='icon-sm'
                                            className='size-7 text-muted-foreground hover:text-foreground'
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await download(item);
                                            }}
                                        />
                                    }
                                >
                                    <DownloadSimpleIcon
                                        className='size-4'
                                        weight='bold'
                                    />
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                            {canRemove && (
                                <Tooltip>
                                    <TooltipTrigger
                                        render={
                                            <Button
                                                id={`delete-${row.index}`}
                                                data-testid={`delete-${row.index}`}
                                                variant='ghost'
                                                size='icon-sm'
                                                className='size-7 text-muted-foreground hover:text-destructive'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingRemoveFile(item);
                                                }}
                                            />
                                        }
                                    >
                                        <TrashIcon className='size-4' weight='bold' />
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [canRemove, copyToClipboard, download, insertTextCallback],
    );

    const table = useReactTable({
        data: files,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row, index) => row.id ?? String(index),
    });

    return (
        <div className='w-full h-full text-sm [&_.rounded-md.border]:rounded-none [&_.rounded-md.border]:border-0'>
            {files.length === 0 ? (
                <p className='px-4 py-3 text-muted-foreground text-center'>
                    No files uploaded yet.
                </p>
            ) : (
                <DataTable table={table} showViewOptions />
            )}
            <AlertDialog
                open={Boolean(pendingRemoveFile)}
                onOpenChange={(open) => {
                    if (!open) setPendingRemoveFile(null);
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Permanently delete{' '}
                            <span className='font-medium text-foreground break-all'>
                                {pendingRemoveFile?.name ?? 'this file'}
                            </span>
                            ? This cannot be undone, and any references to it in notes
                            will stop working.
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
                                if (pendingRemoveFile) removeFile(pendingRemoveFile);
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
