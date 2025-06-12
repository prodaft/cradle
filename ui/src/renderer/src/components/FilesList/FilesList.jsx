import { useState, useEffect, useCallback } from 'react';
import FileItem from '../FileItem/FileItem';
import { getFiles } from '../../services/notesService/notesService';
import AlertBox from '../AlertBox/AlertBox';
import Pagination from '../Pagination/Pagination';
import { useSearchParams } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';

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

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const fetchFiles = useCallback(() => {
        setLoading(true);

        const params = {
            page,
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
    }, [page, query, onError, setAlert]);

    useEffect(() => {
        setPage(Number(searchParams.get('files_page')) || 1);
        fetchFiles();
    }, [fetchFiles]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('files_page', newPage);
        setSearchParams(newParams);

        setPage(newPage);
    };

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <AlertBox alert={alert} setAlert={setAlert} />

                <div>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />

                    {loading ? (
                        <div className='flex items-center justify-center h-full'>
                            <div className='spinner-dot-pulse spinner-xl'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        </div>
                    ) : files.length > 0 ? (
                        <div ref={setNodeRef} className='grid grid-cols-1 gap-2 p-4'>
                            {files.map((file, index) => {
                                // Skip files that are in the filteredFiles array
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
                            })}
                        </div>
                    ) : (
                        <div className='container mx-auto flex flex-col items-center'>
                            <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                                No files found!
                            </p>
                        </div>
                    )}

                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </>
    );
}
