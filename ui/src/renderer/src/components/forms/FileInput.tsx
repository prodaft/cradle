import { useNotif } from '@contexts/ui';
import { useApi, useCradleNavigate } from '@hooks';
import type { FileReference } from '@services/cradle/models';
import { handleAPIError } from '@utils/api';
import { uploadFile } from '@utils/files';
import { CloudUpload } from 'iconoir-react';
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
}

/**
 * This component is used to upload files to the server.
 * It has an input field for selecting files and a button to upload them.
 *
 * The user can upload multiple files at once. Each file is uploaded individually.
 * If any of the files fail to upload, the user is alerted.
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
 * />
 * ```
 */
export default function FileInput({
    fileData,
    setFileData,
    pendingFiles,
    setPendingFiles,
}: FileInputProps): JSX.Element {
    const { fileTransferApi } = useApi();
    const { notify } = useNotif();
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { navigate, navigateLink } = useCradleNavigate();

    // Update the file input's files when pendingFiles changes
    useEffect(() => {
        if (inputRef.current && pendingFiles.length > 0) {
            // Create a new DataTransfer object to convert the array back to a FileList
            const dataTransfer = new DataTransfer();
            pendingFiles.forEach((file) => dataTransfer.items.add(file));
            inputRef.current.files = dataTransfer.files;
        } else if (inputRef.current) {
            // Clear the input
            inputRef.current.value = '';
        }
    }, [pendingFiles]);

    const handleUpload = () => {
        if (!pendingFiles || pendingFiles.length === 0) {
            notify({ type: 'error', text: 'No files selected.' });
            return;
        }

        // Attempt to upload all files and remember which files succeed and which fail
        setIsUploading(true);
        const succeededFileData: FileReference[] = [];
        const failedFiles: File[] = [];

        const fileUploadPromises = pendingFiles.map((file) =>
            fileTransferApi
                .fileTransferUploadRetrieve({ fileName: file.name })
                .then(async (res) => {
                    const uploadUrl = res.presigned;
                    await uploadFile(uploadUrl, file);
                    return res;
                })
                .then((data) => {
                    succeededFileData.push({
                        minioFileName: data.minioFileName,
                        fileName: file.name,
                        bucketName: data.bucketName,
                    });
                })
                .catch((err) => {
                    failedFiles.push(file);
                }),
        );

        // Handle all the failures by alerting the user which uploads failed
        Promise.all(fileUploadPromises)
            .then(() => {
                // Add the files that succeeded to the list of files
                setFileData(fileData.concat(succeededFileData));
            })
            .then(() => {
                // All other files are kept in the input fields and the user is alerted
                if (failedFiles.length > 0) {
                    setPendingFiles(failedFiles);
                    throw new Error(
                        'Failed to upload files: ' +
                            failedFiles.map((file) => file.name).join(', '),
                    );
                } else {
                    setPendingFiles([]);
                    notify({
                        type: 'success',
                        text: 'All files uploaded successfully!',
                    });
                }
            })
            .catch((error) => {
                handleAPIError(error, notify);
            }) // Catches the error thrown in the .then block
            .finally(() => {
                setIsUploading(false);
            });
    };

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            if (event.target && event.target.files && event.target.files.length > 0) {
                // Convert FileList to Array to ensure consistency across browsers
                setPendingFiles(Array.from(event.target.files));
            } else {
                setPendingFiles([]);
            }
        },
        [setPendingFiles],
    );

    // Handle paste events (for the editor component issue)
    const handlePaste = useCallback(
        (e: ClipboardEvent<HTMLDivElement>) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                e.preventDefault();
                // Immediately convert FileList to Array
                setPendingFiles(Array.from(e.clipboardData.files));
            }
        },
        [setPendingFiles],
    );

    return (
        <>
            <div className='flex flex-row gap-2 items-stretch' onPaste={handlePaste}>
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
                />
                <button
                    type='button'
                    className='rounded-xl border border-cradle-border-accent bg-transparent hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors text-cradle-text-secondary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed'
                    onClick={handleUpload}
                    disabled={isUploading || pendingFiles.length === 0}
                >
                    {isUploading && (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    <CloudUpload className='w-5 h-5' strokeWidth={2} />
                </button>
            </div>
        </>
    );
}
