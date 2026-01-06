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
 *
 * @example
 * ```tsx
 * <FileManagementModal
 *   files={noteFiles}
 *   onFilesChange={setFileData}
 *   closeModal={closeModal}
 *   noteId="note-uuid"
 * />
 * ```
 */
export default function FileUploadModal({
    files,
    onFilesChange,
    closeModal,
    initialFiles = [],
    noteId,
}: FileUploadModalProps): JSX.Element {
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles);
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
                // Use the id from the finalize response (already set by FileInput)
                id: f.id || crypto.randomUUID(),
            })),
        ] as FileReferenceWithNote[];
        onFilesChange(updatedFiles);
    };

    return (
        <div className='min-w-[400px] max-w-2xl'>
            {/* Header */}
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Upload Files
                    </h2>
                </div>
            </div>

            {/* File Upload Section */}
            <div className='mb-6 w-full'>
                <FileInput
                    fileData={fileData}
                    setFileData={handleFileDataChange}
                    pendingFiles={pendingFiles}
                    setPendingFiles={setPendingFiles}
                    noteId={noteId}
                />
            </div>

            {/* Actions */}
            <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                <button
                    type='button'
                    className='rounded-lg border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                    onClick={closeModal}
                >
                    Done
                </button>
            </div>
        </div>
    );
}
