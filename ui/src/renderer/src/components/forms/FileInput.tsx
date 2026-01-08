import { toast } from 'sonner';
import { useApi, useCradleNavigate } from '@hooks';
import type {
    FileReference,
    FileUploadFinalizeRequest,
} from '@services/cradle/models';
import { handleAPIError, parseAPIError } from '@utils/api';
import { uploadFile } from '@utils/files';
import { Check, CloudUpload, Xmark } from 'iconoir-react';
import {
    ChangeEvent,
    ClipboardEvent,
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';

/**
 * FileInput component props
 */
export interface FileInputProps {
    /** Files uploaded via this instance of the component */
    fileData: FileReference[];
    /** Callback used when uploaded files change */
    setFileData: Dispatch<SetStateAction<FileReference[]>>;
    /** Array of File objects pending upload */
    pendingFiles: File[];
    /** Callback used when pending files change */
    setPendingFiles: Dispatch<SetStateAction<File[]>>;
    /** Optional note ID to link uploaded files to */
    noteId?: string;
}

/**
 * This component is used to upload files to the server.
 * It has an input field for selecting files and a button to upload them.
 *
 * The user can upload multiple files at once. Files are uploaded sequentially
 * (one at a time) with individual status indicators.
 *
 * Upload flow per file:
 * 1. Request presigned URL from backend (GET /file-transfer/upload/)
 * 2. Upload file directly to presigned URL
 * 3. Finalize upload with backend (POST /file-transfer/upload/{upload_id}/finalize/)
 *
 * @example
 * ```tsx
 * const [fileData, setFileData] = useState<FileReference[]>([]);
 * const [pendingFiles, setPendingFiles] = useState<File[]>([]);
 *
 * <FileInput
 *   fileData={fileData}
 *   setFileData={setFileData}
 *   pendingFiles={pendingFiles}
 *   setPendingFiles={setPendingFiles}
 *   noteId="optional-note-uuid"
 * />
 * ```
 */
export default function FileInput({
    fileData,
    setFileData,
    pendingFiles,
    setPendingFiles,
    noteId,
}: FileInputProps): JSX.Element {
    const { fileTransferApi } = useApi();
    const [isUploading, setIsUploading] = useState(false);
    const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync filesWithStatus when pendingFiles changes
    useEffect(() => {
        setFilesWithStatus(
            pendingFiles.map((file) => ({
                file,
                status: 'pending' as FileUploadStatus,
            })),
        );
    }, [pendingFiles]);

    // Update the file input's files when pendingFiles changes
    useEffect(() => {
        if (inputRef.current && pendingFiles.length > 0) {
            const dataTransfer = new DataTransfer();
            pendingFiles.forEach((file) => dataTransfer.items.add(file));
            inputRef.current.files = dataTransfer.files;
        } else if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [pendingFiles]);

    const updateFileStatus = (
        index: number,
        status: FileUploadStatus,
        error?: string,
    ) => {
        setFilesWithStatus((prev) =>
            prev.map((item, i) => (i === index ? { ...item, status, error } : item)),
        );
    };

    const handleUpload = async () => {
        if (!pendingFiles || pendingFiles.length === 0) {
            toast.error('No files selected.');
            return;
        }

        setIsUploading(true);
        const succeededFileData: FileReference[] = [];
        const failedFiles: File[] = [];

        try {
            // Upload files sequentially
            for (let i = 0; i < filesWithStatus.length; i++) {
                const { file, status } = filesWithStatus[i];

                // Skip already processed files
                if (status === 'success' || status === 'error') {
                    continue;
                }

                // Mark as uploading
                updateFileStatus(i, 'uploading');

                try {
                    // Step 1: Request presigned URL
                    const uploadResponse = await fileTransferApi.fileTransferUploadRetrieve({
                        fileName: file.name,
                        fileSize: file.size,
                    });

                    // Step 2: Upload file directly to presigned URL
                    await uploadFile(uploadResponse.presignedUrl, file);

                    // Step 3: Finalize upload
                    const finalizeRequest: FileUploadFinalizeRequest = noteId
                        ? { noteId }
                        : {};

                    const finalizeResponse = await fileTransferApi.fileTransferUploadFinalizeCreate({
                        uploadId: uploadResponse.uploadId,
                        fileUploadFinalizeRequest: finalizeRequest,
                    });

                    // Add to succeeded files
                    succeededFileData.push({
                        fileId: finalizeResponse.fileId,
                        fileName: finalizeResponse.fileName,
                        objectKey: finalizeResponse.objectKey,
                    });

                    updateFileStatus(i, 'success');
                } catch (error) {
                    // Mark file as failed
                    const errorMessage =
                        error instanceof Error ? error.message : 'Unknown error';
                    updateFileStatus(i, 'error', errorMessage);
                    failedFiles.push(file);
                }
            }

            // Add the files that succeeded to the list of files
            setFileData(fileData.concat(succeededFileData));

            // Handle failures
            if (failedFiles.length > 0) {
                setPendingFiles(failedFiles);
                toast.error(
                    `Failed to upload ${failedFiles.length} file(s): ${failedFiles.map((file) => file.name).join(', ')}`,
                );
            } else {
                setPendingFiles([]);
                toast.success('All files uploaded successfully!');
            }
        } catch (error) {
            const parsed = await parseAPIError(error);
            handleAPIError(parsed);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            if (event.target && event.target.files && event.target.files.length > 0) {
                setPendingFiles(Array.from(event.target.files));
            } else {
                setPendingFiles([]);
            }
        },
        [setPendingFiles],
    );

    const handlePaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                e.preventDefault();
                setPendingFiles(Array.from(e.clipboardData.files));
            }
        },
        [setPendingFiles],
    );

    const renderStatusIcon = (status: FileUploadStatus) => {
        switch (status) {
            case 'uploading':
                return (
                    <div className='w-4 h-4 border-2 border-cradle-accent-primary border-t-transparent rounded-full animate-spin' />
                );
            case 'success':
                return <Check className='w-4 h-4 text-green-500' strokeWidth={2.5} />;
            case 'error':
                return <Xmark className='w-4 h-4 text-red-500' strokeWidth={2.5} />;
            default:
                return <div className='w-4 h-4' />; // Empty placeholder for pending
        }
    };

    return (
        <div className='space-y-3' onPaste={handlePaste}>
            {/* File Input Row */}
            <div className='flex flex-row gap-2 items-stretch'>
                <input
                    type='file'
                    className='flex-1 text-sm text-cradle-text-primary cursor-pointer
                        border border-cradle-border-accent rounded-xl bg-cradle-bg-secondary/5 p-0
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-l-[11px] file:rounded-r-none
                        file:border-0 file:border-r file:border-cradle-border-accent
                        file:bg-cradle-accent-primary/10 file:text-cradle-accent-primary
                        file:text-sm file:font-medium
                        file:cursor-pointer file:transition-colors
                        hover:file:bg-cradle-accent-primary/20
                    '
                    multiple
                    onChange={handleFileChange}
                    ref={inputRef}
                    disabled={isUploading}
                />
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleUpload}
                    disabled={isUploading || pendingFiles.length === 0}
                >
                    {isUploading && (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    <CloudUpload className='w-5 h-5' strokeWidth={2} />
                </Button>
            </div>

            {/* Files List with Status */}
            {filesWithStatus.length > 0 && (
                <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                    {filesWithStatus.map(({ file, status, error }, index) => (
                        <li
                            key={`${file.name}-${index}`}
                            className={`flex items-center gap-3 px-4 py-2 border-b border-cradle-border-accent last:border-b-0 transition-colors ${
                                status === 'error'
                                    ? 'bg-red-500/5'
                                    : status === 'success'
                                      ? 'bg-green-500/5'
                                      : status === 'uploading'
                                        ? 'bg-cradle-accent-primary/5'
                                        : ''
                            }`}
                            title={error || undefined}
                        >
                            <div className='flex-shrink-0'>
                                {renderStatusIcon(status)}
                            </div>
                            <span
                                className={`text-sm truncate flex-1 ${
                                    status === 'error'
                                        ? 'text-red-500'
                                        : status === 'success'
                                          ? 'text-green-500'
                                          : 'text-cradle-text-primary'
                                }`}
                            >
                                {file.name}
                            </span>
                            <span className='text-xs text-cradle-text-tertiary flex-shrink-0'>
                                {(file.size / 1024).toFixed(1)} KB
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
