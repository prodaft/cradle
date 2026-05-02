import {
    FileUpload,
    FileUploadClear,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from '@/components/custom/file-upload';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { CloudArrowUpIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react';
import type { ApiQuery } from '@services/openapi/api-query';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { uploadFile } from '@utils/files';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileWithStatus {
    file: File;
    status: FileUploadStatus;
    progress: number;
    error?: string;
}

/**
 * FileUploadDialog component props
 */
interface FileUploadDialogProps {
    /** Array of files currently attached to the note */
    files: FileReferenceWithNote[];
    /** Callback to update the files list */
    onFilesChange: (files: FileReferenceWithNote[]) => void;
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
    /** Optional initial files from clipboard or other sources */
    initialFiles?: File[];
    /** Note ID to link uploaded files to */
    noteId?: string;
}

/**
 * FileUploadDialog component - upload files to attach to a note
 *
 * Provides file upload functionality for attaching files to notes.
 * Files are uploaded using the presigned URL flow:
 * 1. Request presigned URL from backend
 * 2. Upload file directly to storage
 * 3. Finalize upload with note_id to link the file
 */
export default function FileUploadDialog({
    files,
    onFilesChange,
    open,
    onOpenChange,
    initialFiles = [],
    noteId,
}: FileUploadDialogProps): React.JSX.Element {
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles);
    const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (open) {
            setPendingFiles(initialFiles);
            setFilesWithStatus(
                initialFiles.map((file) => ({
                    file,
                    status: 'pending' as FileUploadStatus,
                    progress: 0,
                })),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleValueChange = useCallback((newFiles: File[]) => {
        setPendingFiles(newFiles);
        // Reset status for new files
        setFilesWithStatus(
            newFiles.map((file) => ({
                file,
                status: 'pending' as FileUploadStatus,
                progress: 0,
            })),
        );
    }, []);

    const updateFileStatus = (
        file: File,
        status: FileUploadStatus,
        progress: number,
        error?: string,
    ) => {
        setFilesWithStatus((prev) =>
            prev.map((item) =>
                item.file === file ? { ...item, status, progress, error } : item,
            ),
        );
    };

    const handleUpload = useCallback(async () => {
        if (pendingFiles.length === 0) {
            toast.error('No files selected.');
            return;
        }

        setIsUploading(true);
        const newFiles: FileReferenceWithNote[] = [];
        const failedWithError: Array<{ file: File; error: string }> = [];

        for (const file of pendingFiles) {
            try {
                updateFileStatus(file, 'uploading', 10);

                // Step 1: Request presigned URL from backend
                const {
                    data: uploadData,
                    error: uploadError,
                    response: uploadResp,
                } = await fetchClient.GET('/file-transfer/upload/', {
                    params: {
                        query: {
                            file_name: file.name,
                            file_size: file.size,
                        } satisfies ApiQuery<'file_transfer_upload_retrieve'>,
                    },
                });
                if (uploadError) throw { response: uploadResp, error: uploadError };

                updateFileStatus(file, 'uploading', 30);

                // Step 2: Upload file directly to presigned URL
                await uploadFile(uploadData.presigned_url, file);

                updateFileStatus(file, 'uploading', 70);

                // Step 3: Finalize upload with note_id
                const {
                    data: finalizeData,
                    error: finalizeError,
                    response: finalizeResp,
                } = await fetchClient.POST(
                    '/file-transfer/upload/{upload_id}/finalize/',
                    {
                        params: { path: { upload_id: uploadData.upload_id } },
                        body: noteId ? { note_id: noteId } : {},
                    },
                );
                if (finalizeError)
                    throw { response: finalizeResp, error: finalizeError };

                updateFileStatus(file, 'success', 100);

                newFiles.push({
                    id: finalizeData.file_id,
                    file_name: finalizeData.file_name,
                } as FileReferenceWithNote);
            } catch (error) {
                const parsed = await parseAPIError(error);
                const errMsg = getDisplayMessage(parsed);
                updateFileStatus(file, 'error', 0, errMsg);
                failedWithError.push({ file, error: errMsg });
            }
        }

        // Update parent with new files
        if (newFiles.length > 0) {
            onFilesChange([...files, ...newFiles]);
        }

        // Handle results
        if (failedWithError.length > 0) {
            toast.error(
                `Failed to upload ${failedWithError.length} file(s): ${failedWithError.map((f) => f.file.name).join(', ')}`,
            );
            // Keep only failed files in the queue with their error messages
            setPendingFiles(failedWithError.map((f) => f.file));
            setFilesWithStatus(
                failedWithError.map(({ file, error }) => ({
                    file,
                    status: 'error' as FileUploadStatus,
                    progress: 0,
                    error,
                })),
            );
        } else {
            toast.success('All files uploaded successfully!');
            // Clear the queue
            setPendingFiles([]);
            setFilesWithStatus([]);
        }

        setIsUploading(false);
    }, [pendingFiles, noteId, files, onFilesChange]);

    const getFileStatus = (file: File): FileWithStatus | undefined => {
        return filesWithStatus.find((f) => f.file === file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Upload files to attach to this note. Files will be uploaded
                        using secure presigned URLs.
                    </DialogDescription>
                </DialogHeader>

                <FileUpload
                    className='w-full overflow-hidden'
                    value={pendingFiles}
                    onValueChange={handleValueChange}
                    multiple
                    disabled={isUploading}
                >
                    <FileUploadDropzone className='min-h-[120px]'>
                        <div className='flex flex-col items-center gap-2 text-center'>
                            <CloudArrowUpIcon
                                className='h-8 w-8 text-muted-foreground'
                                weight='bold'
                            />
                            <div className='text-sm text-muted-foreground'>
                                <span className='font-medium text-foreground'>
                                    Drop files here
                                </span>{' '}
                                or click to browse
                            </div>
                            <FileUploadTrigger asChild>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={isUploading}
                                >
                                    Select Files
                                </Button>
                            </FileUploadTrigger>
                        </div>
                    </FileUploadDropzone>

                    <FileUploadList className='mt-4 max-h-48 overflow-y-auto'>
                        {pendingFiles.map((file) => {
                            const fileStatus = getFileStatus(file);
                            const status = fileStatus?.status || 'pending';
                            const progress = fileStatus?.progress || 0;

                            return (
                                <FileUploadItem
                                    key={file.name + file.lastModified}
                                    value={file}
                                    className={`group ${
                                        status === 'error'
                                            ? 'border-destructive/50 bg-destructive/5'
                                            : status === 'success'
                                              ? 'border-primary/50 bg-primary/5'
                                              : ''
                                    }`}
                                >
                                    <FileUploadItemPreview />
                                    <FileUploadItemMetadata />

                                    {/* Progress indicator */}
                                    {status === 'uploading' && (
                                        <div className='flex items-center gap-2'>
                                            <div className='w-16 h-1.5 bg-muted rounded-full overflow-hidden'>
                                                <div
                                                    className='h-full bg-primary transition-all duration-300'
                                                    style={{
                                                        width: `${progress}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className='text-xs text-muted-foreground'>
                                                {progress}%
                                            </span>
                                        </div>
                                    )}

                                    {/* Status indicator */}
                                    {status === 'success' && (
                                        <span className='text-xs text-primary font-medium'>
                                            ✓
                                        </span>
                                    )}
                                    {status === 'error' && (
                                        <span
                                            className='text-xs text-destructive font-medium'
                                            title={fileStatus?.error}
                                        >
                                            {fileStatus?.error || 'Failed'}
                                        </span>
                                    )}

                                    {/* Delete button - show for pending and error (retry by removing and re-adding) */}
                                    {(status === 'pending' || status === 'error') && (
                                        <FileUploadItemDelete asChild>
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='icon'
                                                className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity'
                                            >
                                                <XIcon
                                                    className='h-4 w-4'
                                                    weight='bold'
                                                />
                                                <span className='sr-only'>
                                                    Remove file
                                                </span>
                                            </Button>
                                        </FileUploadItemDelete>
                                    )}
                                </FileUploadItem>
                            );
                        })}
                    </FileUploadList>

                    {/* Clear all button */}
                    {pendingFiles.length > 1 && !isUploading && (
                        <div className='mt-2 flex justify-end'>
                            <FileUploadClear asChild>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-foreground'
                                >
                                    Clear all
                                </Button>
                            </FileUploadClear>
                        </div>
                    )}
                </FileUpload>

                <DialogFooter>
                    {pendingFiles.length > 0 && (
                        <Button
                            type='button'
                            variant='default'
                            size='sm'
                            onClick={handleUpload}
                            disabled={isUploading || pendingFiles.length === 0}
                        >
                            {isUploading ? (
                                <>
                                    <Spinner />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <UploadSimpleIcon
                                        className='h-4 w-4'
                                        weight='bold'
                                    />
                                    Upload{' '}
                                    {pendingFiles.length > 1
                                        ? `(${pendingFiles.length})`
                                        : ''}
                                </>
                            )}
                        </Button>
                    )}
                    <DialogClose asChild>
                        <Button type='button' variant='outline' size='sm'>
                            Done
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
