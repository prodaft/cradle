import { ConfirmDeletionModal } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApi } from '@/hooks';
import type { FileReference, StateSetter } from '@/types';
import { createDownloadPath } from '@/utils/links';
import { useMutation } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Download, InputField, PasteClipboard, Trash } from 'iconoir-react';
import { useMemo, useState } from 'react';

/**
 * This component is used to display a table of fileData.
 * The table has three columns:
 * - The Tag column contains the tag that can be used to reference the file in the markdown content.
 * - The Filename column contains the name of the file.
 * - The Actions column contains two buttons: one to copy the tag to the clipboard and one to delete the file.
 * The tag will be copied with the syntax [<filename>][<tag>]. Deleting a file will remove it from the table.
 *
 * @function FileTable
 * @param {FileReference[]} fileData - a list of fileData to be displayed in the table. Each file has a tag, a name, and its bucket.
 * @param {StateSetter<FileReference[]>} setFileData - callback used when the fileData change
 * @param {(text: string) => void} insertTextCallback - callback to insert text into editor
 * @returns {FileTable}
 * @constructor
 */
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
    const { fileTransferApi, basePath } = useApi();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingFile, setDeletingFile] = useState<FileReference | null>(null);

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
    });

    // Pre-configured clipboard copy with automatic error/success handling
    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    // Removes a file from the table only. The file is not deleted from the server.
    const handleDelete = (data: FileReference) => {
        setFileData(fileData.filter((d) => d.id !== data.id));
        const minioCache = JSON.parse(localStorage.getItem('minio-cache') || '{}');
        if (minioCache) {
            delete minioCache[createDownloadPath(data, basePath)];
            localStorage.setItem('minio-cache', JSON.stringify(minioCache));
        }
    };

    // Downloads a file
    const handleDownload = async (data: FileReference) => {
        const presignedUrl = await downloadMutation.mutateAsync(data.id!);
        const link = document.createElement('a');
        link.href = presignedUrl;
        link.download = data.fileName || 'data';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<FileReference>[]>(
        () => [
            {
                accessorKey: 'tag',
                id: 'tag',
                header: 'Tag',
                cell: ({ row }) => {
                    const data = row.original;
                    const tag =
                        data.id && data.fileName
                            ? `${data.id}-${data.fileName}`
                            : data.id || '';
                    return (
                        <div className='text-foreground flex items-center'>
                            <div className='max-w-150px truncate px-3'>{tag}</div>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'fileName',
                id: 'fileName',
                header: 'File Name',
                cell: ({ row }) => {
                    const data = row.original;
                    return (
                        <div className='text-foreground flex items-center justify-between'>
                            <div className='max-w-150px truncate pr-3'>
                                {data.fileName}
                            </div>
                            <div className='text-foreground flex items-center justify-end pr-4'>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            id={`insert-${row.index}`}
                                            data-testid={`insert-${row.index}`}
                                            variant='ghost'
                                            size='icon-sm'
                                            className='px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground bg-muted'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const tag =
                                                    data.id && data.fileName
                                                        ? `${data.id}-${data.fileName}`
                                                        : data.id || '';
                                                insertTextCallback(
                                                    `[${data.fileName}][${tag}]`,
                                                );
                                            }}
                                        >
                                            <InputField width='20px' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Insert link into text
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            id={`copy-${row.index}`}
                                            data-testid={`copy-${row.index}`}
                                            variant='ghost'
                                            size='icon-sm'
                                            className='px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground bg-muted'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const tag =
                                                    data.id && data.fileName
                                                        ? `${data.id}-${data.fileName}`
                                                        : data.id || '';
                                                copyToClipboard(
                                                    `[${data.fileName}][${tag}]`,
                                                );
                                            }}
                                        >
                                            <PasteClipboard width='20px' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy to clipboard</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            id={`download-${row.index}`}
                                            data-testid={`download-${row.index}`}
                                            variant='ghost'
                                            size='icon-sm'
                                            className='px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground bg-muted'
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDownload(data);
                                            }}
                                        >
                                            <Download width='20px' />
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
                                            className='px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground bg-muted'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingFile(data);
                                                setDeleteModalOpen(true);
                                            }}
                                        >
                                            <Trash width='20px' />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Remove</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [copyToClipboard, handleDownload, insertTextCallback],
    );

    return (
        <div className='w-full h-full mx-auto bg-transparent rounded-lg overflow-y-auto text-sm z-40'>
            <div className='overflow-x-auto'>
                <div className='w-full bg-muted rounded-md overflow-x-hidden overflow-y-auto'>
                    {!fileData || fileData.length === 0 ? (
                        <p className='ml-4 mt-2 text-foreground'>
                            No files uploaded yet.
                        </p>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={fileData}
                            loading={false}
                            emptyMessage='No files uploaded yet.'
                            manualPagination={true}
                            manualSorting={true}
                        />
                    )}
                </div>
            </div>
            {deletingFile && (
                <ConfirmDeletionModal
                    open={deleteModalOpen}
                    onOpenChange={(open) => {
                        setDeleteModalOpen(open);
                        if (!open) setDeletingFile(null);
                    }}
                    text='Are you sure you want to delete this file?'
                    onConfirm={() => {
                        if (deletingFile) {
                            handleDelete(deletingFile);
                        }
                    }}
                />
            )}
        </div>
    );
}
