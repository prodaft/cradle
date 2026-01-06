import { ConfirmDeletionModal } from '@/components/modals';
import { useModal } from '@/contexts';
import { useApi } from '@/hooks';
import { useAPICall } from '@/hooks/api/useAPICall';
import useAuth from '@/hooks/auth/useAuth';
import type { FileReference, StateSetter } from '@/types';
import { createDownloadPath } from '@/utils/links';
import Tooltip from '@components/base/Tooltip/Tooltip';
import { Download, InputField, PasteClipboard, Trash } from 'iconoir-react';

/**
 * This component is used to display a table of fileData.
 * The table has three columns:
 * - The Tag column contains the tag that can be used to reference the file in the markdown content.
 * - The Filename column contains the name of the file.
 * - The Actions column contains two buttons: one to copy the tag to the clipboard and one to delete the file.
 * The tag will be copied with the syntax [<filename>][<tag>]. Deleting a file will remove it from the table.
 *
 * @function FileTable
 * @param {FileReference[]} fileData - a list of fileData to be displayed in the table. Each file has a tag, a name, and its bucket.
 * @param {StateSetter<FileReference[]>} setFileData - callback used when the fileData change
 * @param {(text: string) => void} insertTextCallback - callback to insert text into editor
 * @returns {FileTable}
 * @constructor
 */
interface FileTableProps {
    fileData: FileReference[];
    setFileData: (data: FileReference[]) => void;
    insertTextCallback: (text: string) => void;
}

export default function FileTable({
    fileData,
    setFileData,
    insertTextCallback,
}: FileTableProps) {
    const { execute } = useAPICall();
    const { fileTransferApi } = useApi();
    const { basePath } = useAuth();
    const { setModal } = useModal();

    // Pre-configured clipboard copy with automatic error/success handling
    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    // Removes a file from the table only. The file is not deleted from the server.
    const handleDelete = (data: FileReference) => {
        console.log('handleDelete', data);
        setFileData(fileData.filter((d) => d.id !== data.id));
        const minioCache = JSON.parse(localStorage.getItem('minio-cache') || '{}');
        if (minioCache) {
            delete minioCache[createDownloadPath(data, basePath)];
            localStorage.setItem('minio-cache', JSON.stringify(minioCache));
        }
    };

    // Downloads a file
    const handleDownload = async (data: FileReference) => {
        const { presignedUrl } = await execute(() =>
            fileTransferApi.fileTransferDownloadRetrieve({
                fileId: data.id!,
            }),
        );
        const link = document.createElement('a');
        link.href = presignedUrl;
        link.download = data.fileName || 'data';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className='w-full h-full mx-auto bg-transparent rounded-lg overflow-y-auto text-sm z-40'>
                <div className='overflow-x-auto'>
                    <div className='w-full bg-gray-2 rounded-md overflow-x-hidden overflow-y-auto'>
                        {(!fileData || fileData.length === 0) && (
                            <p className='ml-4 mt-2 dark:text-zinc-200'>
                                No files uploaded yet.
                            </p>
                        )}
                        {Array.from(fileData).map((data, index) => (
                            <div
                                key={index}
                                className='py-1 border-b dark:border-zinc-600'
                            >
                                <div className='dark:text-zinc-200 flex items-center justify-between w-full'>
                                    <div className='truncate px-3'>{data.fileName}</div>
                                    <div className='dark:text-zinc-200 flex items-center justify-end pr-4 ml-auto'>
                                        <Tooltip content='Insert link into text'>
                                            <span>
                                                <button
                                                    id={`insert-${index}`}
                                                    data-testid={`insert-${index}`}
                                                    className='px-2 py-1 rounded hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors bg-zinc-3'
                                                    onClick={() =>
                                                        insertTextCallback(
                                                            `[${data.fileName}][${data.id}-${data.fileName}]`,
                                                        )
                                                    }
                                                >
                                                    <InputField width='20px' />
                                                </button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip content='Copy to clipboard'>
                                            <span>
                                                <button
                                                    id={`copy-${index}`}
                                                    data-testid={`copy-${index}`}
                                                    className='px-2 py-1 rounded hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors bg-zinc-3'
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            `[${data.fileName}][${data.id}-${data.fileName}]`,
                                                        )
                                                    }
                                                >
                                                    <PasteClipboard width='20px' />
                                                </button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip content='Download'>
                                            <span>
                                                <button
                                                    id={`download-${index}`}
                                                    data-testid={`download-${index}`}
                                                    className='px-2 py-1 rounded hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors bg-zinc-3'
                                                    onClick={() => handleDownload(data)}
                                                >
                                                    <Download width='20px' />
                                                </button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip content='Remove'>
                                            <span>
                                                <button
                                                    id={`delete-${index}`}
                                                    data-testid={`delete-${index}`}
                                                    className='px-2 py-1 rounded hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors bg-zinc-3'
                                                    onClick={() => {
                                                        setModal(ConfirmDeletionModal, {
                                                            text: 'Are you sure you want to delete this file?',
                                                            onConfirm: () =>
                                                                handleDelete(data),
                                                        });
                                                    }}
                                                >
                                                    <Trash width='20px' />
                                                </button>
                                            </span>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
