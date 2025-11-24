import { Download } from 'iconoir-react';
import { forwardRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import type { FileReferenceWithNote } from '@/services/cradle/models';
import { createDashboardLink } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import type { Alert, StateSetter } from '@/types';

/**
 * FileItem component - This component is used to display a file in a list.
 * @function FileItem
 * @param {Object} props - Component props
 * @param {string} props.id - The file ID
 * @param {FileReferenceWithNote} props.file - The file object
 * @param {StateSetter<Alert>} props.setAlert - Function to set alerts
 */
interface FileItemProps {
    id: string;
    file: FileReferenceWithNote;
    setAlert: StateSetter<Alert>;
}

const FileItem = forwardRef<HTMLDivElement, FileItemProps>(function FileItem({ id, file, setAlert, ...props }, ref) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { fileTransferApi } = useApi();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();

    const downloadFile = () => {
        if (file.bucketName && file.minioFileName) {
            fileTransferApi
                .fileTransferDownloadRetrieve({
                    bucketName: file.bucketName,
                    minioFileName: file.minioFileName,
                })
                .then((response) => {
                    const { presigned } = response;
                    const link = document.createElement('a');
                    link.href = presigned;

                    const fileName =
                        file.minioFileName.split('/').pop() || file.minioFileName;
                    link.download = fileName;
                    document.body.appendChild(link);

                    link.click();

                    document.body.removeChild(link);
                })
                .catch((error) => {
                    setAlert({
                        show: true,
                        message: 'Failed to download file. Please try again.',
                        color: 'red',
                    });
                });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .catch((error) => {
                console.error('Failed to copy text: ', error);
            })
            .then(() => {
                setAlert({
                    show: true,
                    message: 'Copied to clipboard',
                    color: 'green',
                });
            });
    };

    if (hidden) return null;

    return (
        <div ref={ref} {...props}>
            <div
                key={file.id}
                className='relative h-fit w-full bg-cradle3 px-3 py-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl my-2 flex items-center'
            >
                <div className='flex-grow text-xs'>
                    <div className='flex flex-wrap gap-2 mb-2 ml-1'>
                        <h2 className='card-header dark:text-white ml-1'>
                            {file.fileName}
                        </h2>
                        {file.entities?.map((entry) => (
                            <a
                                key={entry.name}
                                className='hover:underline badge badge-flat-primary badge-xs px-2 mx-1 my-1 py-1 text-white'
                                href={`#${createDashboardLink(entry)}`}
                                data-custom-href={`#${createDashboardLink(entry)}`}
                                style={{
                                    backgroundColor: entry.color || '#ccc',
                                }}
                            >
                                {entry.name}
                            </a>
                        ))}
                    </div>
                    <div className='mt-1'>
                        <a
                            href={`/notes/${file.noteId}`}
                            onClick={navigateLink(`/notes/${file.noteId}`)}
                            className='text-zinc-500 hover:text-zinc-600 ml-2'
                        >
                            View Note
                        </a>
                        <span className='text-zinc-700 mx-1'>|</span>
                        <span className='text-zinc-500'>
                            {file.timestamp ? formatDate(file.timestamp) : 'N/A'}
                        </span>


                        {file.sha256Hash && (
                            <>
                                <span className='text-zinc-700 mx-1'>|</span>
                                <span
                                    className='text-zinc-500 cursor-pointer hover:dark:bg-zinc-800 hover:bg-zinc-400'
                                    onClick={() => copyToClipboard(file.sha256Hash!)}
                                    title='Click to copy'
                                >
                                    <strong>SHA256:</strong> {file.sha256Hash.substring(0, 21)}...
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className='flex space-x-2 ml-4'>
                    <button
                        onClick={() =>
                            downloadFile()
                        }
                        className='text-white hover:bg-white/20 p-2 rounded-full '
                        title='Download file'
                    >
                        <Download />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default FileItem;
