import type { FileReference, FileReferenceWithNote } from '@services/cradle/models';
import { useEffect, useState } from 'react';
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
    initialFiles = [],
}: FileUploadModalProps): JSX.Element {
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles);
    const [fileData, setFileData] = useState<FileReference[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Auto-select all pending files when the list changes
    useEffect(() => {
        setSelectedIndices(new Set(pendingFiles.map((_, i) => i)));
    }, [pendingFiles]);

    const toggleSelection = (index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

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
            <div className='mb-6 w-full flex justify-center'>
                <div className='w-full'>
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
                    <label className='cradle-label mb-2 block'>
                        Queued for Upload ({selectedIndices.size})
                    </label>
                    <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                        {pendingFiles.map((file, index) => {
                            const isSelected = selectedIndices.has(index);
                            return (
                                <li
                                    key={index}
                                    className={`flex items-center gap-3 px-4 py-2 border-b border-cradle-border-accent last:border-b-0 transition-colors ${isSelected
                                        ? 'hover:bg-cradle-bg-secondary/50'
                                        : 'bg-cradle-bg-secondary/10'
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
                                            ? 'text-cradle-text-primary'
                                            : 'text-cradle-text-tertiary line-through decoration-cradle-text-tertiary'
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
