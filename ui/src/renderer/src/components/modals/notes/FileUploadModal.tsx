import type { FileReference, FileReferenceWithNote } from '@services/cradle/models';
import { useState } from 'react';
import FileInput from '../../forms/FileInput';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
    const handleFileDataChange: React.Dispatch<
        React.SetStateAction<FileReference[]>
    > = (newFileDataOrUpdater) => {
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
        <>
            <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
            </DialogHeader>

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

            {/* Queued Files List */}
            {pendingFiles.length > 0 && (
                <div className='mb-6'>
                    <Label>
                        Queued for Upload ({selectedIndices.size})
                    </Label>
                    <ul className='border border-border-border rounded-lg max-h-48 overflow-y-auto'>
                        {pendingFiles.map((file, index) => {
                            const isSelected = selectedIndices.has(index);
                            return (
                                <li
                                    key={index}
                                    className={`flex items-center gap-3 px-4 py-2 border-b border-border-border last:border-b-0 transition-colors ${isSelected
                                        ? 'hover:bg-bg-secondary/50'
                                        : 'bg-bg-secondary/10'
                                        }`}
                                >
                                    <input
                                        type='checkbox'
                                        className='cradle-checkbox'
                                        checked={isSelected}
                                        onChange={() => toggleSelection(index)}
                                    />
                                    <span
                                        className={`text-sm truncate flex-1 ${isSelected
                                            ? 'text-text-foreground'
                                            : 'text-text-muted-foreground line-through decoration-text-muted-foreground'
                                            }`}
                                    >
                                        {file.name}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className='flex justify-end gap-2 mt-4'>
                <Button
                    type='button'
                    variant='default'
                    size='sm'
                    onClick={closeModal}
                >
                    Done
                </Button>
            </div>
        </>
    );
}
