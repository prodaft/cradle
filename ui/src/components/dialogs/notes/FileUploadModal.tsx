import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/file-upload';
import { useApi } from '@hooks';
import type {
    FileReferenceWithNote,
    FileUploadFinalizeRequest,
} from '@services/cradle/models';
import { uploadFile } from '@utils/files';
import { CloudUpload, Upload, Xmark } from 'iconoir-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileWithStatus {
    file: File;
    status: FileUploadStatus;
    progress: number;
    error?: string;
}

/**
 * FileManagementModal component props
 */
export interface FileUploadModalProps {
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
 * FileManagementModal component - upload files to attach to a note
 *
 * Provides file upload functionality for attaching files to notes.
 * Files are uploaded using the presigned URL flow:
 * 1. Request presigned URL from backend
 * 2. Upload file directly to storage
 * 3. Finalize upload with note_id to link the file
 */
export default function FileUploadModal({
    files,
    onFilesChange,
    open,
    onOpenChange,
    initialFiles = [],
    noteId,
}: FileUploadModalProps): React.JSX.Element {
    const { fileTransferApi } = useApi();
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles);
    const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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
        const failedFiles: File[] = [];

        for (const file of pendingFiles) {
            try {
                updateFileStatus(file, 'uploading', 10);

                // Step 1: Request presigned URL from backend
                const uploadResponse =
                    await fileTransferApi.fileTransferUploadRetrieve({
                        fileName: file.name,
                        fileSize: file.size,
                    });

                updateFileStatus(file, 'uploading', 30);

                // Step 2: Upload file directly to presigned URL
                await uploadFile(uploadResponse.presignedUrl, file);

                updateFileStatus(file, 'uploading', 70);

                // Step 3: Finalize upload with note_id
                const finalizeRequest: FileUploadFinalizeRequest = noteId
                    ? { noteId }
                    : {};
                const finalizeResponse =
                    await fileTransferApi.fileTransferUploadFinalizeCreate({
                        uploadId: uploadResponse.uploadId,
                        fileUploadFinalizeRequest: finalizeRequest,
                    });

                updateFileStatus(file, 'success', 100);

                newFiles.push({
                    id: finalizeResponse.fileId,
                    fileName: finalizeResponse.fileName,
                } as FileReferenceWithNote);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Upload failed';
                updateFileStatus(file, 'error', 0, errorMessage);
                failedFiles.push(file);
            }
        }

        // Update parent with new files
        if (newFiles.length > 0) {
            onFilesChange([...files, ...newFiles]);
        }

        // Handle results
        if (failedFiles.length > 0) {
            toast.error(
                `Failed to upload ${failedFiles.length} file(s): ${failedFiles.map((f) => f.name).join(', ')}`,
            );
            // Keep only failed files in the queue
            setPendingFiles(failedFiles);
            setFilesWithStatus(
                failedFiles.map((file) => {
                    const existing = filesWithStatus.find((f) => f.file === file);
                    return existing || { file, status: 'error', progress: 0 };
                }),
            );
        } else {
            toast.success('All files uploaded successfully!');
            // Clear the queue
            setPendingFiles([]);
            setFilesWithStatus([]);
        }

        setIsUploading(false);
    }, [
        pendingFiles,
        fileTransferApi,
        noteId,
        files,
        onFilesChange,
        filesWithStatus,
    ]);

    const getFileStatus = (file: File): FileWithStatus | undefined => {
        return filesWithStatus.find((f) => f.file === file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='overflow-hidden'>
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Upload files to attach to this note. Files will be
                        uploaded using secure presigned URLs.
                    </DialogDescription>
                </DialogHeader>

                {/* File Upload Section */}
                <div className='w-full overflow-hidden'>
                    <FileUpload
                        value={pendingFiles}
                        onValueChange={handleValueChange}
                        multiple
                        disabled={isUploading}
                    >
                        <FileUploadDropzone className='min-h-[120px]'>
                            <div className='flex flex-col items-center gap-2 text-center'>
                                <CloudUpload className='h-8 w-8 text-muted-foreground' />
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
                                            <span className='text-xs text-destructive font-medium'>
                                                Failed
                                            </span>
                                        )}

                                        {/* Delete button - only show when not uploading */}
                                        {status === 'pending' && (
                                            <FileUploadItemDelete asChild>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity'
                                                >
                                                    <Xmark className='h-4 w-4' />
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
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-4'>
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
                                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className='h-4 w-4' />
                                    Upload{' '}
                                    {pendingFiles.length > 1
                                        ? `(${pendingFiles.length})`
                                        : ''}
                                </>
                            )}
                        </Button>
                    )}
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => onOpenChange(false)}
                    >
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
