import {
    FileUpload,
    FileUploadClear,
    FileUploadDropzone,
    FileUploadTrigger,
} from '@/components/custom/file-upload';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import {
    CheckCircleIcon,
    FileIcon,
    TrashIcon,
    UploadSimpleIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { formatFileSize, uploadFile } from '@utils/files';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface QueueEntry {
    file: File;
    status: FileUploadStatus;
    progress: number;
    error?: string;
}

const ATTACHMENT_STATE = {
    pending: 'idle',
    uploading: 'uploading',
    success: 'done',
    error: 'error',
} as const satisfies Record<
    FileUploadStatus,
    React.ComponentProps<typeof Attachment>['state']
>;

function describeStatus(
    status: FileUploadStatus,
    progress: number,
    error?: string,
): string {
    switch (status) {
        case 'pending':
            return 'Pending';
        case 'uploading':
            return `Uploading ${Math.round(progress)}%`;
        case 'success':
            return 'Uploaded';
        case 'error':
            return error || 'Upload failed';
    }
}

function StatusMedia({ status }: { status: FileUploadStatus }) {
    switch (status) {
        case 'uploading':
            return <Spinner />;
        case 'success':
            return <CheckCircleIcon weight='fill' className='text-primary' />;
        case 'error':
            return <WarningCircleIcon weight='fill' />;
        default:
            return <FileIcon />;
    }
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
    files: noteFiles,
    onFilesChange,
    open,
    onOpenChange,
    initialFiles = [],
    noteId,
}: FileUploadDialogProps): React.JSX.Element {
    const fileIdRef = useRef(new WeakMap<File, string>());
    const noteFilesRef = useRef(noteFiles);
    const [fileEntries, setFileEntries] = useState<QueueEntry[]>([]);
    const [rejectMessages, setRejectMessages] = useState<string[]>([]);

    const selectedFiles = useMemo(
        () => fileEntries.map((entry) => entry.file),
        [fileEntries],
    );

    useEffect(() => {
        noteFilesRef.current = noteFiles;
    }, [noteFiles]);

    const [isUploading, setIsUploading] = useState(false);

    const getListItemId = useCallback((file: File): string => {
        const map = fileIdRef.current;
        let id = map.get(file);
        if (!id) {
            id = crypto.randomUUID();
            map.set(file, id);
        }
        return id;
    }, []);

    useEffect(() => {
        if (!open) return;
        const toPending = (file: File): QueueEntry => ({
            file,
            status: 'pending' as FileUploadStatus,
            progress: 0,
        });
        if (isUploading) {
            setFileEntries((prev) => [
                ...prev,
                ...initialFiles
                    .filter((file) => !prev.some((entry) => entry.file === file))
                    .map(toPending),
            ]);
            return;
        }
        fileIdRef.current = new WeakMap<File, string>();
        setFileEntries(initialFiles.map(toPending));
        setRejectMessages([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectFiles = useCallback((next: File[]) => {
        setFileEntries((prev) => {
            return next.map((file) => {
                const existing = prev.find((entry) => entry.file === file);
                if (existing?.status === 'success') {
                    return { ...existing, file };
                }
                return {
                    file,
                    status: 'pending' as FileUploadStatus,
                    progress: 0,
                };
            });
        });
    }, []);

    const removeFile = useCallback(
        (file: File) => {
            selectFiles(
                fileEntries
                    .filter((entry) => entry.file !== file)
                    .map((entry) => entry.file),
            );
        },
        [fileEntries, selectFiles],
    );

    const updateEntry = (
        file: File,
        status: FileUploadStatus,
        progress: number,
        error?: string,
    ) => {
        setFileEntries((prev) =>
            prev.map((entry) =>
                entry.file === file ? { ...entry, status, progress, error } : entry,
            ),
        );
    };

    const runUploads = useCallback(
        async (queue: File[]) => {
            const uploadedRefs: FileReferenceWithNote[] = [];
            const failures: Array<{ file: File; error: string }> = [];
            setIsUploading(true);

            try {
                for (const file of queue) {
                    try {
                        updateEntry(file, 'uploading', 10);

                        const {
                            data: uploadData,
                            error: uploadError,
                            response: uploadResp,
                        } = await fetchClient.POST('/files/uploads/', {
                            body: {
                                file_name: file.name,
                                file_size: file.size,
                            },
                        });
                        if (uploadError)
                            throw { response: uploadResp, error: uploadError };

                        updateEntry(file, 'uploading', 30);
                        await uploadFile(uploadData.presigned_url, file);
                        updateEntry(file, 'uploading', 70);

                        const {
                            data: finalizeData,
                            error: finalizeError,
                            response: finalizeResp,
                        } = await fetchClient.POST(
                            '/files/uploads/{upload_id}/finalize/',
                            {
                                params: { path: { upload_id: uploadData.upload_id } },
                                body: noteId ? { note_id: noteId } : {},
                            },
                        );
                        if (finalizeError)
                            throw { response: finalizeResp, error: finalizeError };

                        updateEntry(file, 'success', 100);
                        uploadedRefs.push({
                            id: finalizeData.file_id,
                            name: finalizeData.file_name,
                        } as FileReferenceWithNote);
                    } catch (error) {
                        const parsed = await parseAPIError(error);
                        const errMsg = getDisplayMessage(parsed);
                        updateEntry(file, 'error', 0, errMsg);
                        failures.push({ file, error: errMsg });
                    }
                }
            } finally {
                setIsUploading(false);
            }

            if (uploadedRefs.length > 0) {
                const updated = [...noteFilesRef.current, ...uploadedRefs];
                noteFilesRef.current = updated;
                onFilesChange(updated);
            }

            return { uploadedRefs, failures };
        },
        [noteId, onFilesChange],
    );

    const uploadQueue = useMemo(
        () =>
            fileEntries
                .filter((entry) => entry.status !== 'success')
                .map((entry) => entry.file),
        [fileEntries],
    );

    const uploadAll = useCallback(async () => {
        if (uploadQueue.length === 0) {
            toast.info('All selected files are already uploaded.');
            return;
        }

        const { uploadedRefs, failures } = await runUploads(uploadQueue);

        if (failures.length > 0) {
            toast.error(
                `Failed to upload ${failures.length} file(s): ${failures.map((f) => f.file.name).join(', ')}`,
            );
        } else if (uploadedRefs.length > 0) {
            toast.success('All files uploaded successfully!');
        }
    }, [uploadQueue, runUploads]);

    const uploadOne = useCallback(
        async (file: File) => {
            const entry = fileEntries.find((item) => item.file === file);
            if (!entry || entry.status === 'success' || entry.status === 'uploading') {
                return;
            }

            const { uploadedRefs, failures } = await runUploads([file]);

            if (failures.length > 0) {
                toast.error(`Failed to upload ${file.name}`);
            } else if (uploadedRefs.length > 0) {
                toast.success(`Uploaded ${file.name}`);
            }
        },
        [fileEntries, runUploads],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className='flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl'
            >
                <FileUpload
                    className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
                    value={selectedFiles}
                    onValueChange={selectFiles}
                    onFileReject={(_file, message) => {
                        setRejectMessages((prev) =>
                            prev.includes(message) ? prev : [...prev, message],
                        );
                    }}
                    multiple
                    disabled={isUploading}
                >
                    <FileUploadDropzone
                        tabIndex={-1}
                        onClick={(event) => event.preventDefault()}
                        className={cn(
                            'flex min-h-0 w-full flex-1 flex-col items-stretch justify-start gap-0',
                            'rounded-none border-0 p-0 shadow-none outline-none',
                            'hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0',
                            'data-dragging:bg-accent/20 data-dragging:ring-2 data-dragging:ring-inset data-dragging:ring-primary/30',
                            // The dropzone wraps the whole dialog; keep Close and tooltips clickable
                            // while uploading (each control has its own `disabled`).
                            'data-disabled:pointer-events-auto',
                        )}
                    >
                        <DialogHeader className='shrink-0 border-b px-6 pt-6 pb-4'>
                            <DialogTitle>Upload Files</DialogTitle>
                            <DialogDescription>
                                Attach files by dragging them here or using Add files.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
                            <div className='space-y-3'>
                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <h3 className='text-sm font-medium'>
                                        Files ({fileEntries.length})
                                    </h3>
                                    <div className='flex flex-wrap gap-2'>
                                        <FileUploadTrigger asChild>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                size='sm'
                                                disabled={isUploading}
                                            >
                                                <UploadSimpleIcon
                                                    className='mr-1.5 h-4 w-4'
                                                    weight='bold'
                                                />
                                                Add files
                                            </Button>
                                        </FileUploadTrigger>
                                        {fileEntries.length > 1 && !isUploading && (
                                            <FileUploadClear asChild>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                >
                                                    <TrashIcon
                                                        className='mr-1.5 h-4 w-4'
                                                        weight='bold'
                                                    />
                                                    Remove all
                                                </Button>
                                            </FileUploadClear>
                                        )}
                                    </div>
                                </div>

                                {fileEntries.length > 0 && (
                                    <div className='flex flex-col gap-2'>
                                        {fileEntries.map(
                                            ({ file, status, progress, error }) => (
                                                <Attachment
                                                    key={getListItemId(file)}
                                                    state={ATTACHMENT_STATE[status]}
                                                    className='w-full'
                                                >
                                                    <AttachmentMedia>
                                                        <StatusMedia status={status} />
                                                    </AttachmentMedia>
                                                    <AttachmentContent>
                                                        <AttachmentTitle>
                                                            {file.name}
                                                        </AttachmentTitle>
                                                        <AttachmentDescription
                                                            title={error}
                                                        >
                                                            {formatFileSize(file.size)}{' '}
                                                            ·{' '}
                                                            {describeStatus(
                                                                status,
                                                                progress,
                                                                error,
                                                            )}
                                                        </AttachmentDescription>
                                                    </AttachmentContent>
                                                    <AttachmentActions>
                                                        {(status === 'pending' ||
                                                            status === 'error') && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    render={
                                                                        <AttachmentAction
                                                                            onClick={() =>
                                                                                uploadOne(
                                                                                    file,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isUploading
                                                                            }
                                                                            aria-label={`Upload ${file.name}`}
                                                                        />
                                                                    }
                                                                >
                                                                    <UploadSimpleIcon weight='bold' />
                                                                </TooltipTrigger>
                                                                <TooltipContent side='top'>
                                                                    Upload
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                render={
                                                                    <AttachmentAction
                                                                        onClick={() =>
                                                                            removeFile(
                                                                                file,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isUploading
                                                                        }
                                                                        aria-label={`Remove ${file.name}`}
                                                                    />
                                                                }
                                                            >
                                                                <TrashIcon weight='bold' />
                                                            </TooltipTrigger>
                                                            <TooltipContent side='top'>
                                                                Remove
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </AttachmentActions>
                                                </Attachment>
                                            ),
                                        )}
                                    </div>
                                )}

                                {rejectMessages.length > 0 && (
                                    <Alert variant='destructive'>
                                        <WarningCircleIcon
                                            className='h-4 w-4'
                                            weight='bold'
                                        />
                                        <AlertTitle>Could not add file(s)</AlertTitle>
                                        <AlertDescription>
                                            {rejectMessages.map((msg, index) => (
                                                <p key={index}>{msg}</p>
                                            ))}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>

                        <DialogFooter className='shrink-0 border-t px-6 py-4 sm:justify-end'>
                            {fileEntries.length > 0 && (
                                <Button
                                    type='button'
                                    variant='default'
                                    size='sm'
                                    onClick={uploadAll}
                                    disabled={isUploading || uploadQueue.length === 0}
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
                                            {uploadQueue.length > 1
                                                ? `(${uploadQueue.length})`
                                                : ''}
                                        </>
                                    )}
                                </Button>
                            )}
                            <DialogClose
                                render={
                                    <Button type='button' variant='outline' size='sm' />
                                }
                            >
                                Close
                            </DialogClose>
                        </DialogFooter>
                    </FileUploadDropzone>
                </FileUpload>
            </DialogContent>
        </Dialog>
    );
}
