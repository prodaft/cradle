import type { FileReferenceWithNote } from '@/types/models';
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { fetchClient } from '@services/openapi/client';
import { uploadFile } from '@utils/files';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import { toast } from 'sonner';

export interface PendingUpload {
    id: string;
    file: File;
    /** `processing` covers finalizing once the bytes are in storage. */
    status: 'uploading' | 'processing' | 'error';
    /** Uploaded percentage, 0..100. */
    progress: number;
    error?: string;
}

// Hashes and the detected MIME type come from a background task shortly after
// finalize; poll for them this many times, this far apart.
const DETAIL_POLL_ATTEMPTS = 15;
const DETAIL_POLL_INTERVAL_MS = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Uploads files to a note (presigned URL → storage → finalize) and tracks the ones
 * still in flight or failed. Finished files are appended to the note's files, then
 * filled in with their hashes and detected MIME type once the backend has them.
 */
export function useNoteFileUploads(
    noteId: string | undefined,
    setFiles: Dispatch<SetStateAction<FileReferenceWithNote[]>>,
) {
    const [uploads, setUploads] = useState<PendingUpload[]>([]);
    const noteIdRef = useRef(noteId);

    // Uploads belong to the note they were started on; switching notes clears them.
    useEffect(() => {
        noteIdRef.current = noteId;
        setUploads([]);
    }, [noteId]);

    const patch = useCallback((id: string, changes: Partial<PendingUpload>) => {
        setUploads((prev) =>
            prev.map((upload) =>
                upload.id === id ? { ...upload, ...changes } : upload,
            ),
        );
    }, []);

    const loadDetails = useCallback(
        async (fileId: string) => {
            for (let attempt = 1; attempt <= DETAIL_POLL_ATTEMPTS; attempt++) {
                await wait(DETAIL_POLL_INTERVAL_MS);
                if (noteIdRef.current !== noteId) return;
                const data = await fetchClient
                    .GET('/files/{file_id}/', { params: { path: { file_id: fileId } } })
                    .then(
                        (result) => result.data,
                        () => undefined, // Details are a nice-to-have; give up quietly.
                    );
                if (!data) return; // Deleted meanwhile, or no longer accessible.
                // Files over the hashing size limit never get hashes, so the last
                // attempt keeps whatever arrived (e.g. just the MIME type).
                if (data.sha256 || attempt === DETAIL_POLL_ATTEMPTS) {
                    // Only update a file still listed, so a deleted one doesn't return.
                    setFiles((prev) =>
                        prev.map((file) =>
                            file.id === fileId ? { ...file, ...data } : file,
                        ),
                    );
                    return;
                }
            }
        },
        [noteId, setFiles],
    );

    const run = useCallback(
        async (id: string, file: File) => {
            patch(id, { status: 'uploading', progress: 0, error: undefined });
            try {
                const {
                    data: uploadData,
                    error: uploadError,
                    response: uploadResp,
                } = await fetchClient.POST('/files/uploads/', {
                    body: { file_name: file.name, file_size: file.size },
                });
                if (uploadError) throw { response: uploadResp, error: uploadError };

                await uploadFile(uploadData.presigned_url, file, (fraction) =>
                    patch(id, { progress: fraction * 100 }),
                );
                patch(id, { status: 'processing', progress: 100 });

                const {
                    data: finalizeData,
                    error: finalizeError,
                    response: finalizeResp,
                } = await fetchClient.POST('/files/uploads/{upload_id}/finalize/', {
                    params: { path: { upload_id: uploadData.upload_id } },
                    body: noteId ? { note_id: noteId } : {},
                });
                if (finalizeError)
                    throw { response: finalizeResp, error: finalizeError };

                if (noteIdRef.current !== noteId) return;
                setUploads((prev) => prev.filter((upload) => upload.id !== id));
                // Size and browser MIME type are known now; the rest is loaded below.
                setFiles((prev) => [
                    ...prev,
                    {
                        id: finalizeData.file_id,
                        name: finalizeData.file_name,
                        size: file.size,
                        mime_type: file.type || null,
                    } as FileReferenceWithNote,
                ]);
                void loadDetails(finalizeData.file_id);
            } catch (error) {
                const parsed = await parseAPIError(error);
                if (noteIdRef.current !== noteId) return;
                const message = getDisplayMessage(parsed);
                patch(id, { status: 'error', error: message });
                toast.error(`Couldn't upload ${file.name}: ${message}`);
            }
        },
        [noteId, patch, setFiles, loadDetails],
    );

    const upload = useCallback(
        (files: File[]) => {
            const added = files.map<PendingUpload>((file) => ({
                id: crypto.randomUUID(),
                file,
                status: 'uploading',
                progress: 0,
            }));
            setUploads((prev) => [...prev, ...added]);
            for (const entry of added) void run(entry.id, entry.file);
        },
        [run],
    );

    const retry = useCallback(
        (pending: PendingUpload) => void run(pending.id, pending.file),
        [run],
    );

    const dismiss = useCallback((id: string) => {
        setUploads((prev) => prev.filter((upload) => upload.id !== id));
    }, []);

    return { uploads, upload, retry, dismiss };
}
