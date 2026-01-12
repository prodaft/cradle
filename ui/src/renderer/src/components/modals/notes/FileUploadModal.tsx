import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type {
    FileReferenceWithNote,
    FileUploadFinalizeResponse,
} from '@services/cradle/models';
import React, { useState } from 'react';
import FileInput from '../../forms/FileInput';

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
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <FileManagementModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   files={noteFiles}
 *   onFilesChange={setFileData}
 *   noteId="note-uuid"
 * />
 * ```
 */
export default function FileUploadModal({
    files,
    onFilesChange,
    open,
    onOpenChange,
    initialFiles = [],
    noteId,
}: FileUploadModalProps): React.JSX.Element {
    const [pendingFiles, setPendingFiles] = useState<File[]>(initialFiles);
    const [fileData, setFileData] = useState<FileUploadFinalizeResponse[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

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
    const handleFileDataChange: React.Dispatch<
        React.SetStateAction<FileUploadFinalizeResponse[]>
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
                id: f.fileId,
                fileName: f.fileName,
                // Map other properties as needed for FileReferenceWithNote
            })),
        ] as FileReferenceWithNote[];
        onFilesChange(updatedFiles);
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
                        <Label>Queued for Upload ({selectedIndices.size})</Label>
                        <ul className='border border-border rounded-lg max-h-48 overflow-y-auto'>
                            {pendingFiles.map((file, index) => {
                                const isSelected = selectedIndices.has(index);
                                return (
                                    <li
                                        key={index}
                                        className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 transition-colors ${
                                            isSelected
                                                ? 'hover:bg-secondary/50'
                                                : 'bg-secondary/10'
                                        }`}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                                toggleSelection(index)
                                            }
                                        />
                                        <span
                                            className={`text-sm truncate flex-1 ${
                                                isSelected
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground line-through decoration-muted-foreground'
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
                        onClick={() => onOpenChange(false)}
                    >
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
