import { useNavigate } from 'react-router-dom';
import { forwardRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { Download } from 'iconoir-react';
import { createDownloadPath } from '../../utils/textEditorUtils/textEditorUtils';
import { authAxios } from '../../services/axiosInstance/axiosInstance';

/**
 * FileItem component - This component is used to display a file in a list.
 * @function FileItem
 * @param {Object} props - Component props
 * @param {string} props.id - The file ID
 * @param {Object} props.file - The file object
 * @param {Function} props.setAlert - Function to set alerts
 */
const FileItem = forwardRef(function ({ id, file, setAlert, ...props }, ref) {
    const navigate = useNavigate();
    const [hidden, setHidden] = useState(false);
    const location = useLocation();

    const downloadFile = () => {
        if (file.bucket_name && file.minio_file_name) {
            const url = createDownloadPath({
                bucket_name: file.bucket_name,
                minio_file_name: file.minio_file_name,
            });

            authAxios
                .get(url)
                .then((response) => {
                    const { presigned } = response.data;
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

    if (hidden) return null;

    return (
        <div ref={ref} {...props}>
            <div
                key={file.id}
                className='relative h-fit w-full bg-cradle3 px-3 py-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl my-2 flex items-center'
            >
                <div className='flex-grow'>
                    <h2 className='card-header w-full mx-2 dark:text-white'>
                        {file.file_name}
                    </h2>
                    <div>
                        <a
                            href={`/notes/${file.note_id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/notes/${file.note_id}`);
                            }}
                            className='text-zinc-500 hover:text-zinc-600 ml-2'
                        >
                            View Note
                        </a>
                        <span className='text-zinc-700 mx-1'>|</span>
                        <span className='text-zinc-500'>
                            {formatDate(new Date(file.timestamp))}
                        </span>
                    </div>
                </div>
                <div className='flex space-x-2 ml-4'>
                    <button
                        onClick={() =>
                            downloadFile(file.bucket_name, file.minio_file_name)
                        }
                        className='text-white hover:bg-white/20 p-2 rounded-full transition-colors'
                    >
                        <Download />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default FileItem;
