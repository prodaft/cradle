import { Download } from 'iconoir-react';
import useApi from '@/hooks/api/useApi';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import FileItem from '../files/FileItem';
import ListView from '../../base/ListView/ListView';

/**
 * Displays files attached to a note in a table/card view
 */
export default function FilesView({ files, setAlert, copyToClipboard }) {
    const { fileTransferApi } = useApi();

    if (!files || files.length === 0) {
        return null;
    }

    const handleDownload = (file) => {
        fileTransferApi
            .fileTransferDownloadRetrieve({
                bucketName: file.bucket_name,
                minioFileName: file.minio_file_name,
            })
            .then((response) => {
                const { presigned } = response;
                const link = document.createElement('a');
                link.href = presigned;
                const fileName = file.minio_file_name.split('/').pop() || file.minio_file_name;
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
    };

    return (
        <div>
            <div className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'>
                <div className='w-[95%] h-full flex flex-col p-6'>
                    <ListView
                        data={files}
                        columns={[
                            { key: 'name', label: 'Name', className: 'w-64' },
                            { key: 'entities', label: 'Entities', className: 'w-32' },
                            { key: 'mimetype', label: 'MimeType', className: 'w-32' },
                            { key: 'sha256', label: 'SHA256' },
                            { key: 'uploadedAt', label: 'Uploaded At', className: 'w-32' },
                            { key: 'actions', label: 'Actions', className: 'w-32' },
                        ]}
                        renderRow={(file, index) => (
                            <tr key={file.id || index}>
                                <td className='truncate w-32'>
                                    {truncateText(file.file_name, 32)}
                                </td>
                                <td className=''>
                                    <div className='flex flex-wrap gap-1'>
                                        {file.entities?.slice(0, 3).map((entity) => (
                                            <span
                                                key={entity.name}
                                                className='badge badge-xs px-1 text-white'
                                                style={{
                                                    backgroundColor: entity.color || '#ccc',
                                                }}
                                            >
                                                {entity.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className='truncate w-32'>
                                    {truncateText(file.mimetype, 32)}
                                </td>
                                <td className=''>
                                    {file.sha256_hash ? (
                                        <span
                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                            onClick={() => copyToClipboard(file.sha256_hash)}
                                            title='Click to copy'
                                        >
                                            {file.sha256_hash.substring(0, 21)}...
                                        </span>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className=''>
                                    {formatDate(new Date(file.timestamp))}
                                </td>
                                <td className='w-32'>
                                    <div className='flex space-x-1'>
                                        {file.bucket_name && file.minio_file_name && (
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className='btn btn-ghost btn-xs text-green-600 hover:text-green-500'
                                                title='Download'
                                            >
                                                <Download className='w-4 h-4' aria-hidden='true' />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                        renderCard={(file) => (
                            <FileItem
                                key={file.id}
                                file={file}
                                setAlert={setAlert}
                            />
                        )}
                        loading={false}
                        forceCardView={false}
                        emptyMessage="No files found!"
                        tableClassName="table"
                    />
                </div>
            </div>
        </div>
    );
}
