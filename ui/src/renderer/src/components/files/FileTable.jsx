import { Download, InputField, PasteClipboard, Trash } from 'iconoir-react';
import { useAPICall } from '@/hooks/useAPICall';
import { createDownloadPath } from '@/utils/textEditorUtils/textEditorUtils';
import Tooltip from '../Tooltip/Tooltip';

/**
 * This component is used to display a table of fileData.
 * The table has three columns:
 * - The Tag column contains the tag that can be used to reference the file in the markdown content.
 * - The Filename column contains the name of the file.
 * - The Actions column contains two buttons: one to copy the tag to the clipboard and one to delete the file.
 * The tag will be copied with the syntax [<filename>][<tag>]. Deleting a file will remove it from the table.
 *
 * @function FileTable
 * @param {Array<FileData>} fileData - a list of fileData to be displayed in the table. Each file has a tag, a name, and its bucket.
 * @param {StateSetter<Array<FileData>>} setFileData - callback used when the fileData change
 * @returns {FileTable}
 * @constructor
 */
export default function FileTable({ fileData, setFileData, insertTextCallback }) {
    const { executor } = useAPICall();

    // Pre-configured clipboard copy with automatic error/success handling
    const copyToClipboard = executor(
        async (text) => {
            await navigator.clipboard.writeText(text);
        },
        { successMessage: 'Copied to clipboard!' }
    );

    // Removes a file from the table only. The file is not deleted from the server.
    const handleDelete = (data) => {
        setFileData(fileData.filter((d) => d.minio_file_name !== data.minio_file_name));
        const minioCache = JSON.parse(localStorage.getItem('minio-cache'));
        if (minioCache) {
            delete minioCache[createDownloadPath(data)];
            localStorage.setItem('minio-cache', JSON.stringify(minioCache));
        }
    };

    // Downloads a file
    const handleDownload = (data) => {
        const url = createDownloadPath(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <>
            <div className='w-full h-full mx-auto p-2 bg-transparent rounded-lg overflow-y-auto text-sm z-40'>
                <div className='overflow-x-auto'>
                    <div className='w-full bg-gray-2 rounded-md overflow-x-hidden overflow-y-auto'>
                        {(!fileData || fileData.length === 0) && (
                            <p className='ml-4 mt-2 dark:text-zinc-200'>
                                No files uploaded yet.
                            </p>
                        )}
                        {fileData.length > 0 && (
                            <div className='grid grid-cols-2 p-2 border-b dark:border-zinc-400 text-base'>
                                <div className='font-bold dark:text-zinc-200'>Tag</div>
                                <div className='font-bold dark:text-zinc-200'>
                                    File Name
                                </div>
                            </div>
                        )}
                        {Array.from(fileData).map((data, index) => (
                            <div
                                key={index}
                                className='grid grid-cols-2 py-1 border-b dark:border-zinc-600'
                            >
                                <div className='dark:text-zinc-200 flex items-center'>
                                    <div className='max-w-150px truncate px-3'>
                                        {data.minio_file_name}
                                    </div>
                                </div>
                                <div className='dark:text-zinc-200 flex items-center justify-between'>
                                    <div className='max-w-150px truncate pr-3'>
                                        {data.file_name}
                                    </div>
                                    <div className='dark:text-zinc-200 flex items-center justify-end pr-4'>
                                        <Tooltip content='Insert link into text'>
                                            <span>
                                                <button
                                                    id={`insert-${index}`}
                                                    data-testid={`insert-${index}`}
                                                    className='px-2 py-1 rounded hover:opacity-60 bg-zinc-3'
                                                    onClick={() =>
                                                        insertTextCallback(
                                                            `[${data.file_name}][${data.minio_file_name}]`,
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
                                                    className='px-2 py-1 rounded hover:opacity-60 bg-zinc-3'
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            `[${data.file_name}][${data.minio_file_name}]`,
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
                                                    className='px-2 py-1 rounded hover:opacity-60 bg-zinc-3'
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
                                                    className='px-2 py-1 rounded hover:opacity-60 bg-zinc-3'
                                                    onClick={() => handleDelete(data)}
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
