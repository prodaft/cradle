import { ConfirmDeletionModal } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useApi } from '@/hooks';
import type { FileReference } from '@/types';
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
                accessorKey: 'fileName',
                id: 'fileName',
                header: 'File',
                cell: ({ row }) => {
                    const data = row.original;
                    return (
                        <div className='text-foreground flex items-center'>
                            <span className='truncate max-w-[200px]' title={data.fileName}>
                                {data.fileName}
                            </span>
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'tag',
                id: 'tag',
                header: 'Reference Tag',
                cell: ({ row }) => {
                    const data = row.original;
                    const tag =
                        data.id && data.fileName
                            ? `${data.id}-${data.fileName}`
                            : data.id || '';
                    return (
                        <code className='text-xs text-muted-foreground font-mono truncate max-w-[480px] block' title={tag}>
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
                    const tag =
                        data.id && data.fileName
                            ? `${data.id}-${data.fileName}`
                            : data.id || '';
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
                                            insertTextCallback(
                                                `[${data.fileName}][${tag}]`,
                                            );
                                        }}
                                    >
                                        <InputField className='size-4' />
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
                                            copyToClipboard(
                                                `[${data.fileName}][${tag}]`,
                                            );
                                        }}
                                    >
                                        <PasteClipboard className='size-4' />
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
                                        <Download className='size-4' />
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
                                            setDeleteModalOpen(true);
                                        }}
                                    >
                                        <Trash className='size-4' />
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

    return (
        <div className='w-full h-full text-sm [&_.rounded-md.border]:rounded-none [&_.rounded-md.border]:border-0'>
            {!fileData || fileData.length === 0 ? (
                <p className='px-4 py-3 text-muted-foreground text-center'>
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
