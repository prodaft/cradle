import { Download } from 'iconoir-react';
import { forwardRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useApi from '@/hooks/useApi/useApi';
import useCradleNavigate from '@/hooks/useCradleNavigate/useCradleNavigate';
import { createDashboardLink } from '@/utils/dashboardUtils/dashboardUtils';
import { formatDate } from '@/utils/dateUtils/dateUtils';

/**
 * FileItem component - This component is used to display a file in a list.
 * @function FileItem
 * @param {Object} props - Component props
 * @param {string} props.id - The file ID
 * @param {Object} props.file - The file object
 * @param {Function} props.setAlert - Function to set alerts
 */
const FileItem = forwardRef(function ({ id, file, setAlert, ...props }, ref) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { fileTransferApi } = useApi();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();

    const downloadFile = () => {
        if (file.bucket_name && file.minio_file_name) {
            fileTransferApi
                .fileTransferDownloadRetrieve({
                    bucketName: file.bucket_name,
                    minioFileName: file.minio_file_name,
                })
                .then((response) => {
                    const { presigned } = response;
                    const link = document.createElement('a');
                    link.href = presigned;

                    const fileName =
                        file.minio_file_name.split('/').pop() || file.minio_file_name;
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

    const copyToClipboard = (text) => {
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
                            {file.file_name}
                        </h2>
                        {file.entities.map((entry) => (
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
                            href={`/notes/${file.note_id}`}
                            onClick={navigateLink(`/notes/${file.note_id}`)}
                            className='text-zinc-500 hover:text-zinc-600 ml-2'
                        >
                            View Note
                        </a>
                        <span className='text-zinc-700 mx-1'>|</span>
                        <span className='text-zinc-500'>
                            {formatDate(new Date(file.timestamp))}
                        </span>


                        {file.sha256_hash && (
                            <>
                                <span className='text-zinc-700 mx-1'>|</span>
                                <span
                                    className='text-zinc-500 cursor-pointer hover:dark:bg-zinc-800 hover:bg-zinc-400'
                                    onClick={() => copyToClipboard(file.sha256_hash)}
                                    title='Click to copy'
                                >
                                    <strong>SHA256:</strong> {file.sha256_hash.substring(0, 21)}...
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className='flex space-x-2 ml-4'>
                    <button
                        onClick={() =>
                            downloadFile(file.bucket_name, file.minio_file_name)
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
