import { useDroppable } from '@dnd-kit/core';
import { Download, Notes } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authAxios } from '../../services/axiosInstance/axiosInstance';
import { getFiles } from '../../services/notesService/notesService';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { createDownloadPath } from '../../utils/textEditorUtils/textEditorUtils';
import AlertBox from '../AlertBox/AlertBox';
import FileItem from '../FileItem/FileItem';
import ListView from '../ListView/ListView';
import Pagination from '../Pagination/Pagination';

/**
 * FilesList component - This component is used to display a list of files.
 * @function FilesList
 * @param {Object} props - Component props
 * @param {Object} props.query - Query parameters for filtering files
 * @param {Array} props.filteredFiles - Files to filter out from the results
 * @param {Array} props.fileActions - Actions that can be performed on files
 * @param {Object} props.references - References for drag and drop functionality
 * @param {Function} props.setAlert - Function to set alerts (optional)
 * @param {Function} props.onError - Error handler function (optional)
 * @returns {JSX.Element}
 */
export default function FilesList({
    query = {},
    filteredFiles = [],
    fileActions = [],
    references = null,
    setAlert: externalSetAlert = null,
    onError = null,
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [files, setFiles] = useState([]);
    const [alert, setInternalAlert] = useState({
        show: false,
        message: '',
        color: 'red',
    });

    // Use external setAlert if provided, otherwise use internal
    const setAlert = externalSetAlert || setInternalAlert;
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('files_page')) || 1);
    const [sortField, setSortField] = useState(searchParams.get('files_sort_field') || 'timestamp');
    const [sortDirection, setSortDirection] = useState(searchParams.get('files_sort_direction') || 'desc');
    const [pageSize, setPageSize] = useState(Number(searchParams.get('files_pagesize')) || 10);

    // Mapping of table columns to API field names
    const sortFieldMapping = {
        name: 'file_name',
        uploadedAt: 'timestamp',
        mimetype: 'mimetype',
    };

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const handleSort = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);

        // Reset to first page when sorting changes
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('files_page', '1');
        newParams.set('files_sort_field', field);
        newParams.set('files_sort_direction', direction);
        setSearchParams(newParams, { replace: true });
    };

    const fetchFiles = useCallback(() => {
        setLoading(true);

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        const params = {
            page,
            page_size: pageSize,
            order_by: orderBy,
            ...query,
        };

        getFiles(params)
            .then((response) => {
                setFiles(response.data.results);
                setTotalPages(response.data.total_pages);
                setLoading(false);
            })
            .catch((error) => {
                if (onError) {
                    onError(error);
                } else {
                    setAlert({
                        show: true,
                        message: 'Failed to fetch files. Please try again.',
                        color: 'red',
                    });
                }
                setLoading(false);
            });
    }, [page, pageSize, sortField, sortDirection, query, setAlert]);

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

    useEffect(() => {
        setPage(Number(searchParams.get('files_page')) || 1);
        fetchFiles();
    }, [fetchFiles, pageSize]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('files_page', newPage);
        setSearchParams(newParams);

        setPage(newPage);
    };

    const columns = [
        { key: 'name', label: 'Name', className: 'w-64' },
        { key: 'uploadedAt', label: 'Uploaded At', className: 'w-32' },
        { key: 'entities', label: 'Entities', className: 'w-32' },
        { key: 'mimetype', label: 'MimeType', className: 'w-32' },
        { key: 'md5', label: 'MD5' },
        { key: 'sha1', label: 'SHA1' },
        { key: 'sha256', label: 'SHA256' },
        { key: 'actions', label: 'Actions', className: 'w-32' },
    ];

    const renderRow = (file, index) => {
        for (const f of filteredFiles) {
            if (f.id === file.id) return null;
        }

        return (
            <tr key={file.id || index}>
                <td className='truncate w-32'>
                    {truncateText(file.file_name, 32)}
                </td>
                <td className=''>
                    {formatDate(new Date(file.timestamp))}
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
                    {file.md5_hash ? (
                        <span
                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                            onClick={() => copyToClipboard(file.md5_hash)}
                            title='Click to copy'
                        >
                            {file.md5_hash.substring(0, 16)}...
                        </span>
                    ) : (
                        '-'
                    )}
                </td>
                <td className=''>
                    {file.sha1_hash ? (
                        <span
                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                            onClick={() => copyToClipboard(file.sha1_hash)}
                            title='Click to copy'
                        >
                            {file.sha1_hash.substring(0, 32)}...
                        </span>
                    ) : (
                        '-'
                    )}
                </td>
                <td className=''>
                    {file.sha256_hash ? (
                        <span
                            className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded'
                            onClick={() => copyToClipboard(file.sha256_hash)}
                            title='Click to copy'
                        >
                            {file.sha256_hash.substring(0, 32)}...
                        </span>
                    ) : (
                        '-'
                    )}
                </td>
                <td className='w-32'>
                    <div className='flex space-x-1'>
                        <button
                            onClick={() => {
                                const navigate = window.location.hash.includes('#')
                                    ? (path) => (window.location.hash = path)
                                    : (path) => (window.location.href = path);
                                navigate(`/notes/${file.note_id}`);
                            }}
                            className='btn btn-ghost btn-xs text-blue-600 hover:text-blue-500'
                            title='View Note'
                        >
                            <Notes className='w-4 h-4' aria-hidden='true' />
                        </button>
                        {file.bucket_name && file.minio_file_name && (
                            <button
                                onClick={() => {
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
                                                file.minio_file_name.split('/').pop() ||
                                                file.minio_file_name;
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
                                }}
                                className='btn btn-ghost btn-xs text-green-600 hover:text-green-500'
                                title='Download'
                            >
                                <Download className='w-4 h-4' aria-hidden='true' />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const renderCard = (file, index) => {
        for (const f of filteredFiles) {
            if (f.id === file.id) return null;
        }
        return (
            <FileItem
                id={file.id}
                key={index}
                file={file}
                setAlert={setAlert}
                actions={fileActions}
            />
        );
    };

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <AlertBox alert={alert} setAlert={setAlert} />

                {!loading && files.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('files_page', '1');
                            newParams.set('files_pagesize', String(newSize));
                            setSearchParams(newParams, { replace: true });
                        }}
                    />
                )}

                <div ref={setNodeRef} className='grid grid-cols-1 gap-2 p-4'>
                    <ListView
                        data={files}
                        columns={columns}
                        renderRow={renderRow}
                        renderCard={renderCard}
                        loading={loading}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        sortFieldMapping={sortFieldMapping}
                        emptyMessage="No files found!"
                        tableClassName="table"
                    />
                </div>

                {!loading && files.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pageSize}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('files_page', '1');
                            newParams.set('files_pagesize', String(newSize));
                            setSearchParams(newParams, { replace: true });
                        }}
                    />
                )}
            </div>
        </>
    );
}
