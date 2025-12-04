import type { FileReference, FileReferenceWithNote } from '@services/cradle/models';
import { useState } from 'react';
import FileInput from '../../forms/FileInput';

/**
 * FileManagementModal component props
 */
export interface FileUploadModalProps {
    /** Array of files currently attached to the note */
    files: FileReferenceWithNote[];
    /** Callback to update the files list */
    onFilesChange: (files: FileReferenceWithNote[]) => void;
    /** Function to close the modal */
    closeModal: () => void;
}

/**
 * FileManagementModal component - upload files to attach to a note
 *
 * Provides file upload functionality for attaching files to notes.
 *
 * @example
 * ```tsx
 * <FileManagementModal
 *   files={noteFiles}
 *   onFilesChange={setFileData}
 *   closeModal={closeModal}
 * />
 * ```
 */
export default function FileUploadModal({
    files,
    onFilesChange,
    closeModal,
}: FileUploadModalProps): JSX.Element {
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [fileData, setFileData] = useState<FileReference[]>([]);

    // When new files are uploaded via FileInput, add them to the files list
    const handleFileDataChange: React.Dispatch<React.SetStateAction<FileReference[]>> = (
        newFileDataOrUpdater,
    ) => {
        const newFileData =
            typeof newFileDataOrUpdater === 'function'
                ? newFileDataOrUpdater(fileData)
                : newFileDataOrUpdater;

        setFileData(newFileData);

        // Merge new uploads with existing files
        const newFilesOnly = newFileData.slice(fileData.length);
        const updatedFiles = [
            ...files,
            ...newFilesOnly.map((f) => ({
                ...f,
                id: crypto.randomUUID(), // Temporary ID for new files
            })),
        ] as FileReferenceWithNote[];
        onFilesChange(updatedFiles);
    };

    return (
        <div className='w-full max-w-2xl'>
            {/* Header */}
            <h2 className='text-xl font-semibold cradle-text-primary cradle-mono mb-4 text-center'>
                Upload Files
            </h2>

            {/* File Upload Section */}
            <div className='mb-6 w-full flex justify-center'>
                <div>
                    <FileInput
                        fileData={fileData}
                        setFileData={handleFileDataChange}
                        pendingFiles={pendingFiles}
                        setPendingFiles={setPendingFiles}
                    />
                </div>
            </div>

            {/* Queued Files List */}
            {pendingFiles.length > 0 && (
                <div className='mb-6'>
                    <h3 className='text-sm font-medium cradle-text-secondary cradle-mono mb-2'>
                        Queued for Upload ({pendingFiles.length})
                    </h3>
                    <ul className='cradle-border max-h-48 overflow-y-auto'>
                        {pendingFiles.map((file, index) => (
                            <li
                                key={index}
                                className='px-4 py-2 cradle-text-primary text-sm cradle-border-b last:border-b-0 hover:cradle-bg-secondary transition-colors'
                            >
                                {file.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className='cradle-border-t pt-4 mt-4'>
                <div className='flex gap-3 justify-center'>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-primary px-6'
                        onClick={closeModal}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
