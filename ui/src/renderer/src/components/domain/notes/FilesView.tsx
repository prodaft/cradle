import { Download } from 'iconoir-react';
import type { FileReferenceWithNote } from '@services/cradle/models';
import useApi from '@/hooks/api/useApi';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import FileItem from '../files/FileItem';
import ListView from '../../base/ListView/ListView';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface FilesViewProps {
    files: FileReferenceWithNote[];
    setAlert: React.Dispatch<React.SetStateAction<Alert>>;
    copyToClipboard: (text: string) => void;
}

/**
 * Displays files attached to a note in a table/card view
 */
export default function FilesView({ files, setAlert, copyToClipboard }: FilesViewProps) {
    const { fileTransferApi } = useApi();

    if (!files || files.length === 0) {
        return null;
    }

    const handleDownload = (file: FileReferenceWithNote) => {
        fileTransferApi
            .fileTransferDownloadRetrieve({
                bucketName: file.bucketName,
                minioFileName: file.minioFileName,
            })
            .then((response) => {
                const { presigned } = response;
                const link = document.createElement('a');
                link.href = presigned;
                const fileName = file.minioFileName.split('/').pop() || file.minioFileName;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(() => {
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
                        renderRow={(file: FileReferenceWithNote, index: number) => (
                            <tr key={file.id || index}>
                                <td className='truncate w-32'>
                                    {truncateText(file.fileName, 32)}
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
                                    {file.mimetype ? truncateText(file.mimetype, 32) : '-'}
                                </td>
                                <td className=''>
                                    {file.sha256Hash ? (
                                        <span
                                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                                            onClick={() => copyToClipboard(file.sha256Hash!)}
                                            title='Click to copy'
                                        >
                                            {file.sha256Hash.substring(0, 21)}...
                                        </span>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td className=''>
                                    {file.timestamp && formatDate(new Date(file.timestamp))}
                                </td>
                                <td className='w-32'>
                                    <div className='flex space-x-1'>
                                        {file.bucketName && file.minioFileName && (
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
                        renderCard={(file: FileReferenceWithNote) => (
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
