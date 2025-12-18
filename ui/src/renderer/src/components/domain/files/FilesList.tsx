import Tooltip from '@/components/base/Tooltip/Tooltip';
import { useNotif } from '@/contexts';
import useApi from '@/hooks/api/useApi';
import type { Alert, StateSetter } from '@/types';
import { truncateText } from '@/utils/dashboard';
import { formatDate } from '@/utils/dates';
import AlertBox from '@components/base/Alert/AlertBox';
import Badge from '@components/base/Badge/Badge';
import TableCard from '@components/base/Card/TableCard';
import ListView from '@components/base/ListView/ListView';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import { useDroppable } from '@dnd-kit/core';
import type { FileReferenceWithNote } from '@services/cradle/models';
import bytes from 'bytes';
import { Search, Xmark } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface FilesListQuery {
    date?: string;
    keyword?: string;
    linked_to?: number | string; // Entry ID (number) or string query parameter
    linked_to_exact_match?: boolean;
    mimetype?: string;
    references?: string;
    timestamp_gte?: string;
    timestamp_lte?: string;
}

/**
 * FilesList component - This component is used to display a list of files.
 * @param query - Query parameters for filtering files
 * @param filteredFiles - Files to filter out from the results
 * @param fileActions - Actions that can be performed on files
 * @param references - References for drag and drop functionality
 * @param setAlert - Function to set alerts (optional)
 * @param onError - Error handler function (optional)
 */
interface FilesListProps {
    query?: FilesListQuery;
    filteredFiles?: FileReferenceWithNote[];
    fileActions?: any[];
    references?: any;
    setAlert?: StateSetter<Alert> | null;
    onError?: ((error: any) => void) | null;
    onCountChange?: (count: { current: number; total: number }) => void;
}

// Mapping of table columns to API field names - moved outside component to prevent recreation
const SORT_FIELD_MAPPING: Record<string, string> = {
    name: 'file_name',
    uploadedAt: 'timestamp',
    mimetype: 'mimetype',
    fileSize: 'file_size',
};

// Empty defaults to prevent new object creation on each render
const EMPTY_QUERY = {};
const EMPTY_FILTERED_FILES: FileReferenceWithNote[] = [];
const EMPTY_FILE_ACTIONS: any[] = [];

export default function FilesList({
    query = EMPTY_QUERY,
    filteredFiles = EMPTY_FILTERED_FILES,
    fileActions = EMPTY_FILE_ACTIONS,
    references = null,
    setAlert: externalSetAlert = null,
    onError = null,
    onCountChange,
}: FilesListProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileReferenceWithNote[]>([]);
    const [alert, setInternalAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });

    // Use external setAlert if provided, otherwise use internal - memoized to prevent recreation
    const setAlert = useMemo(
        () => externalSetAlert || setInternalAlert,
        [externalSetAlert],
    );
    const { notify } = useNotif();
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(Number(searchParams.get('files_page')) || 1);
    const [sortField, setSortField] = useState(
        searchParams.get('files_sort_field') || 'timestamp',
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        (searchParams.get('files_sort_direction') as 'asc' | 'desc') || 'desc',
    );
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('files_pagesize')) || 10,
    );
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { notesApi, fileTransferApi } = useApi();

    const { setNodeRef } = useDroppable({
        id: 'files-droppable',
    });

    const handleSort = useCallback(
        (field: string, direction: 'asc' | 'desc') => {
            setSortField(field);
            setSortDirection(direction);

            // Reset to first page when sorting changes
            setPage(1);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', '1');
            newParams.set('files_sort_field', field);
            newParams.set('files_sort_direction', direction);
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const fetchFiles = useCallback(async () => {
        setLoading(true);

        try {
            const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

            // Map snake_case to camelCase for the autogenerated API
            const params: any = {
                page,
                pageSize: pageSize,
                orderBy: orderBy,
                date: query.date,
                keyword: searchQuery || query.keyword,
                linkedTo: query.linked_to,
                linkedToExactMatch: query.linked_to_exact_match,
                mimetype: query.mimetype,
                references: query.references,
                timestampGte: query.timestamp_gte,
                timestampLte: query.timestamp_lte,
            };

            // Remove undefined values
            Object.keys(params).forEach(
                (key) => params[key] === undefined && delete params[key],
            );

            const response = await notesApi.notesFilesRetrieve(params);
            setFiles(response.results);
            setTotalPages(response.totalPages);
            if (onCountChange) {
                onCountChange({
                    current: response.results.length,
                    total: response.count || 0,
                });
            }
            setLoading(false);
        } catch (error) {
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
        }
    }, [
        page,
        pageSize,
        sortField,
        sortDirection,
        query,
        searchQuery,
        notesApi,
        onCountChange,
        onError,
        setAlert,
    ]);

    const copyToClipboard = useCallback(
        (text: string) => {
            navigator.clipboard
                .writeText(text)
                .catch((error) => {
                    console.error('Failed to copy text: ', error);
                })
                .then(() => {
                    notify({
                        type: 'success',
                        text: 'Copied to clipboard',
                    });
                });
        },
        [setAlert],
    );

    // Download a single file
    const handleDownloadFile = useCallback(async (file: FileReferenceWithNote) => {
        if (!file.bucketName || !file.minioFileName) {
            setAlert({
                show: true,
                message: 'File download information is missing.',
                color: 'red',
            });
            return;
        }

        try {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                bucketName: file.bucketName,
                minioFileName: file.minioFileName,
            });
        } catch (error) {
            setAlert({
                show: true,
                message: 'Failed to download file. Please try again.',
                color: 'red',
            });
        }
    }, [fileTransferApi, setAlert]);

    // Download selected files
    const handleDownloadSelected = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        try {
            for (const fileId of selectedFiles) {
                const file = files.find((f) => f.id === fileId);
                if (file && file.bucketName && file.minioFileName) {
                    const response = await fileTransferApi.fileTransferDownloadRetrieve(
                        {
                            bucketName: file.bucketName,
                            minioFileName: file.minioFileName,
                        },
                    );
                    const { presigned } = response;
                    const link = document.createElement('a');
                    link.href = presigned;
                    const fileName =
                        file.minioFileName.split('/').pop() || file.minioFileName;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
            notify({
                type: 'success',
                text: `Downloaded ${selectedFiles.length} file(s)`,
            });

        } catch (error) {
            setAlert({
                show: true,
                message: 'Failed to download files. Please try again.',
                color: 'red',
            });
        }
    }, [selectedFiles, files, fileTransferApi, setAlert]);

    const handleSearchSubmit = useCallback(() => {
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('files_page', '1');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    // Memoize the files_page value to prevent unnecessary rerenders
    const filesPage = useMemo(
        () => searchParams.get('files_page'),
        [searchParams],
    );

    useEffect(() => {
        const pageFromParams = Number(filesPage) || 1;
        setPage(pageFromParams);
        fetchFiles();
    }, [filesPage, fetchFiles, pageSize]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', String(newPage));
            setSearchParams(newParams);
        },
        [searchParams, setSearchParams],
    );

    // Memoize columns to prevent recreation on every render
    const columns = useMemo(
        () => [
            { key: 'name', label: 'Name', className: 'w-64' },
            { key: 'entities', label: 'Entities', className: 'w-32' },
            { key: 'mimetype', label: 'MimeType', className: 'w-32' },
            { key: 'fileSize', label: 'Size', className: 'w-24' },
            { key: 'sha256', label: 'SHA256', className: 'w-48' },
            { key: 'uploadedAt', label: 'Uploaded At', className: 'w-32' },
        ],
        [],
    );

    interface SelectProps {
        enableMultiSelect?: boolean;
        isSelected?: boolean;
        onSelect?: () => void;
    }

    const renderRow = useCallback(
        (
            file: FileReferenceWithNote,
            index: number,
            selectProps: SelectProps = {},
        ) => {
            for (const f of filteredFiles) {
                if (f.id === file.id) return null;
            }

            const { enableMultiSelect, isSelected, onSelect } = selectProps;

            return (
                <tr key={file.id || index}>
                    {enableMultiSelect && (
                        <td className='w-12' onClick={(e) => e.stopPropagation()}>
                            <div className='flex items-center'>
                                <input
                                    type='checkbox'
                                    className='cradle-checkbox'
                                    checked={isSelected}
                                    onChange={onSelect}
                                />
                            </div>
                        </td>
                    )}
                    <td className='truncate w-32'>{truncateText(file.fileName, 32)}</td>
                    <td className=''>
                        <div className='flex flex-wrap gap-1'>
                            {file.entities?.slice(0, 3).map((entity) => (
                                <div
                                    key={entity.name}
                                    className='cursor-pointer'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                            `/dashboards/${entity.subtype || 'unknown'}/${encodeURIComponent(entity.name)}`,
                                        );
                                    }}
                                    title={`View ${entity.subtype || 'entity'}: ${entity.name}`}
                                >
                                    <Badge color={entity.color || '#ccc'} shape='pill'>
                                        {entity.name}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className='truncate w-32'>{truncateText(file.mimetype, 32)}</td>
                    <td className='w-24'>
                        {file.fileSize != null
                            ? bytes.format(file.fileSize, { unitSeparator: ' ' })
                            : '-'}
                    </td>
                    <td className='w-48'>
                        {file.sha256Hash ? (
                            <Tooltip content='Click to copy'>
                                <span
                                    className='cursor-pointer hover:bg-zinc-400 hover:dark:bg-zinc-800 px-1 rounded truncate block'
                                    onClick={() => copyToClipboard(file.sha256Hash!)}
                                >
                                    {file.sha256Hash!.substring(0, 48)}...
                                </span>
                            </Tooltip>
                        ) : (
                            '-'
                        )}
                    </td>
                    <td className='w-32'>
                        {file.timestamp ? formatDate(file.timestamp) : '-'}
                    </td>
                </tr>
            );
        },
        [filteredFiles, copyToClipboard, handleDownloadFile],
    );

    // Memoize the setSelected callback to prevent recreation on every render
    const handleSetSelected = useCallback((ids: (string | number)[]) => {
        setSelectedFiles(
            ids.filter((id): id is string => typeof id === 'string'),
        );
    }, []);

    const handlePageSizeChange = useCallback(
        (newSize: number) => {
            setPageSize(newSize);
            setPage(1);
            const newParams = new URLSearchParams(searchParams);
            newParams.set('files_page', '1');
            newParams.set('files_pagesize', String(newSize));
            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <AlertBox alert={alert} />

                {/* Compact Control Bar - Actions and Pagination */}
                {!loading && (
                    <TableCard>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            {/* Left: Actions */}
                            <div className='flex items-center gap-2 flex-shrink-0'>
                                <button
                                    onClick={handleDownloadSelected}
                                    disabled={files.length === 0 || selectedFiles.length === 0}
                                    className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                >
                                    <svg
                                        width='18'
                                        height='18'
                                        viewBox='0 0 24 24'
                                        strokeWidth='1.5'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                        color='currentColor'
                                        className='text-cradle-text-secondary'
                                    >
                                        <path
                                            d='M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                        <path
                                            d='M12 3V16M12 16L16 11.625M12 16L8 11.625'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </button>
                                <button
                                    disabled={true}
                                    className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full'
                                >
                                    <svg
                                        width='18'
                                        height='18'
                                        viewBox='0 0 24 24'
                                        strokeWidth='1.5'
                                        fill='none'
                                        xmlns='http://www.w3.org/2000/svg'
                                        color='currentColor'
                                        className='text-cradle-text-secondary'
                                    >
                                        <path
                                            d='M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                        <path
                                            d='M21 6L15.375 6M3 6L8.625 6M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6L15.375 6'
                                            stroke='currentColor'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </button>
                                <div className='h-8 w-px bg-cradle-border-accent'></div>
                                {!isSearchExpanded ? (
                                    <button
                                        onClick={() => setIsSearchExpanded(true)}
                                        className='flex items-center justify-center w-10 h-10 border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary rounded-full'
                                        title='Search'
                                    >
                                        <Search className='w-4 h-4' />
                                    </button>
                                ) : (
                                    <div className='flex items-center gap-2 min-w-[280px] bg-cradle-bg-elevated border border-cradle-border-accent h-10 px-2 rounded-full'>
                                        <button
                                            onClick={() => {
                                                handleSearchSubmit();
                                            }}
                                            className='p-1 flex-shrink-0 transition-colors text-cradle-text-muted hover:text-cradle-text-primary'
                                            title='Search'
                                        >
                                            <Search className='w-4 h-4' />
                                        </button>
                                        <input
                                            ref={searchInputRef}
                                            type='text'
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSearchSubmit();
                                                }
                                                if (e.key === 'Escape') {
                                                    if (!searchQuery) {
                                                        setIsSearchExpanded(false);
                                                    }
                                                }
                                            }}
                                            onBlur={() => {
                                                if (!searchQuery) {
                                                    setIsSearchExpanded(false);
                                                }
                                            }}
                                            placeholder='Search files...'
                                            className='flex-grow bg-transparent text-sm outline-none text-cradle-text-primary placeholder:text-cradle-text-muted rounded-none font-mono'
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    handleSearchSubmit();
                                                }}
                                                className='p-1 flex-shrink-0 text-cradle-text-muted hover:text-cradle-text-primary transition-colors'
                                                title='Clear search'
                                            >
                                                <Xmark className='w-4 h-4' />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right: Pagination */}
                            <PaginationWrapper
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                pageSize={pageSize}
                                onPageSizeChange={handlePageSizeChange}
                                disabled={files.length === 0}
                            />
                        </div>
                    </TableCard>
                )}

                <div ref={setNodeRef} className='grid grid-cols-1 gap-2'>
                    <ListView
                        data={files}
                        columns={columns}
                        renderRow={renderRow}
                        loading={loading}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        sortFieldMapping={SORT_FIELD_MAPPING}
                        emptyMessage='No files found!'
                        tableClassName='table'
                        enableMultiSelect={true}
                        setSelected={handleSetSelected}
                    />
                </div>
            </div>
        </>
    );
}
