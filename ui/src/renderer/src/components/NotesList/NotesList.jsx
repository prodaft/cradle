import {
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { searchNote } from '../../services/notesService/notesService';
import { parseMarkdownInline } from '../../utils/customParser/customParser';
import {
    capitalizeString,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import AlertBox from '../AlertBox/AlertBox';
import { HoverPreview } from '../HoverPreview/HoverPreview';
import ListView from '../ListView/ListView';
import Note from '../Note/Note';
import DeleteNote from '../NoteActions/DeleteNote';
import EditNote from '../NoteActions/EditNote';
import Pagination from '../Pagination/Pagination';

export default function NotesList({
    query,
    filteredNotes = [],
    noteActions = [],
    forceCardView = false,
    references = null,
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const { profile } = useProfile();
    const [page, setPage] = useState(Number(searchParams.get('notes_page')) || 1);
    const [sortField, setSortField] = useState(searchParams.get('notes_sort_field') || 'timestamp');
    const [sortDirection, setSortDirection] = useState(searchParams.get('notes_sort_direction') || 'desc');
    const { navigate, navigateLink } = useCradleNavigate();
    const [hoveredNote, setHoveredNote] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);
    const HOVER_DELAY = 800;
    const [selectedNotes, setSelectedNotes] = useState([]);
    const [selectedAction, setSelectedAction] = useState('');
    const [isApplyingAction, setIsApplyingAction] = useState(false);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) ||
        (!forceCardView && profile?.compact_mode ? 20 : 10)
    );

    // Mapping of table columns to API field names
    const sortFieldMapping = {
        title: 'title',
        description: 'timestamp', // Description column sorts by timestamp as fallback
        author: 'author__username',
        editor: 'editor__username',
        createdAt: 'timestamp',
        lastChanged: 'edit_timestamp',
    };

    const handleMouseEnter = (note, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMousePosition({
            x: rect.right,
            y: rect.top,
        });

        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredNote(note);
        }, HOVER_DELAY);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setHoveredNote(null);
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    const getStatusIcon = (status) => {
        if (!status) return null;

        switch (status) {
            case 'healthy':
                return null;
            case 'processing':
                return (
                    <InfoCircleSolid className='text-blue-500' width='18' height='18' />
                );
            case 'warning':
                return (
                    <WarningTriangleSolid
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
                return (
                    <WarningCircleSolid
                        className='text-red-500'
                        width='18'
                        height='18'
                    />
                );
            default:
                return null;
        }
    };

    const handleSort = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);

        // Reset to first page when sorting changes
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', '1');
        newParams.set('notes_sort_field', field);
        newParams.set('notes_sort_direction', direction);
        setSearchParams(newParams, { replace: true });
    };

    const fetchNotes = useCallback(() => {
        if (query == null) return;
        setLoading(true);

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        searchNote({
            page_size: pageSize,
            page,
            order_by: orderBy,
            ...query,
        })
            .then((response) => {
                setNotes(response.data.results);
                setTotalPages(response.data.total_pages);
                setLoading(false);
            })
            .catch((error) => {
                setAlert({
                    show: true,
                    message: 'Failed to fetch notes. Please try again.',
                    color: 'red',
                });
                setLoading(false);
            });
    }, [page, pageSize, sortField, sortDirection, query]);

    useEffect(() => {
        setPage(Number(searchParams.get('notes_page')) || 1);
        fetchNotes();
    }, [fetchNotes, pageSize]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', newPage);
        setSearchParams(newParams);

        setPage(newPage);
    };

    const handleApplyAction = async () => {
        if (!selectedAction || selectedNotes.length === 0) return;

        setIsApplyingAction(true);

        // Dummy async function
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsApplyingAction(false);
        console.log('Applied action:', selectedAction, 'to notes:', selectedNotes);
    };

    const columns = [
        { key: 'status', label: '' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'author', label: 'Author' },
        { key: 'editor', label: 'Editor' },
        { key: 'createdAt', label: 'Created At' },
        { key: 'lastChanged', label: 'Updated At' },
        { key: 'actions', label: 'Actions', className: 'w-16' },
    ];

    const renderRow = (note, index, selectProps = {}) => {
        // Skip filtered notes
        for (const n of filteredNotes) {
            if (n.id === note.id) return null;
        }

        const { enableMultiSelect, isSelected, onSelect } = selectProps;

        return (
            <tr
                key={note.id}
                className='cursor-pointer'
                onClick={navigateLink(`/notes/${note.id}`)}
                onMouseEnter={(e) => handleMouseEnter(note, e)}
                onMouseLeave={handleMouseLeave}
            >
                {enableMultiSelect && (
                    <td className='w-12' onClick={(e) => e.stopPropagation()}>
                        <input
                            type='checkbox'
                            className='checkbox checkbox-sm'
                            checked={isSelected}
                            onChange={onSelect}
                        />
                    </td>
                )}
                <td className='w-8'>
                    {note.status && (
                        <span
                            className='inline-flex items-center align-middle tooltip tooltip-right tooltip-primary'
                            data-tooltip={
                                note.status_message ||
                                capitalizeString(note.status)
                            }
                        >
                            {getStatusIcon(note.status)}
                        </span>
                    )}
                </td>
                <td
                    className={`truncate w-64`}
                    data-tooltip={note.metadata?.title}
                >
                    {truncateText(
                        parseMarkdownInline(note.metadata?.title),
                        64,
                    )}
                </td>
                <td className='truncate max-w-xs'>
                    {note.metadata?.description
                        ? parseMarkdownInline(note.metadata?.description)
                        : '-'}
                </td>
                <td className='truncate w-32'>
                    {truncateText(note.author?.username, 16)}
                </td>
                <td className='truncate w-32'>
                    {truncateText(note.editor?.username, 16)}
                </td>
                <td className='w-36'>
                    {formatDate(new Date(note.timestamp))}
                </td>
                <td className='w-36'>
                    {note.edit_timestamp
                        ? formatDate(new Date(note.edit_timestamp))
                        : '-'}
                </td>
                <td className='w-16'>
                    <div className='flex items-center space-x-1'>
                        <EditNote
                            note={note}
                            setAlert={setAlert}
                            setHidden={() => { }}
                            key={note.id}
                            classNames='w-4 h-4'
                        />
                        <DeleteNote
                            note={note}
                            setAlert={setAlert}
                            setHidden={() => { }}
                            key={note.id}
                            classNames='w-4 h-4'
                        />
                    </div>
                </td>
            </tr>
        );
    };

    const renderCard = (note, index) => {
        for (const n of filteredNotes) {
            if (n.id === note.id) return null;
        }
        return (
            <Note
                id={note.id}
                key={index}
                note={note}
                setAlert={setAlert}
                actions={noteActions}
            />
        );
    };

    const actionBar = (
        <div className='flex items-center gap-3'>
            <select
                className='select select-sm select-bordered w-48'
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                disabled={selectedNotes.length === 0}
            >
                <option value=''>Select action...</option>
                <option value='delete'>Delete</option>
                <option value='export'>Export</option>
                <option value='archive'>Archive</option>
            </select>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
                {selectedNotes.length} row{selectedNotes.length !== 1 ? 's' : ''} selected
            </span>
            <button
                className='btn btn-sm btn-primary'
                onClick={handleApplyAction}
                disabled={!selectedAction || selectedNotes.length === 0 || isApplyingAction}
            >
                {isApplyingAction ? (
                    <>
                        <span className='loading loading-spinner loading-sm'></span>
                        Applying...
                    </>
                ) : (
                    'Apply'
                )}
            </button>
        </div>
    );

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <AlertBox alert={alert} setAlert={setAlert} />

                {!loading && notes.length > 0 && (
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex-1'>{actionBar}</div>
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            pageSize={pageSize}
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                setPage(1);
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('notes_page', '1');
                                newParams.set('notes_pagesize', String(newSize));
                                setSearchParams(newParams, { replace: true });
                            }}
                        />
                        <div className='flex-1'></div>
                    </div>
                )}

                <ListView
                    data={notes}
                    columns={columns}
                    renderRow={renderRow}
                    renderCard={renderCard}
                    loading={loading}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    sortFieldMapping={sortFieldMapping}
                    forceCardView={forceCardView}
                    emptyMessage="No notes found!"
                    tableClassName="table table-hover"
                    enableMultiSelect={true}
                    setSelected={setSelectedNotes}
                />

                {!loading && notes.length > 0 && (
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex-1'>{actionBar}</div>
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            pageSize={pageSize}
                            onPageSizeChange={(newSize) => {
                                setPageSize(newSize);
                                setPage(1);
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('notes_page', '1');
                                newParams.set('notes_pagesize', String(newSize));
                                setSearchParams(newParams, { replace: true });
                            }}
                        />
                        <div className='flex-1'></div>
                    </div>
                )}
            </div>
            {hoveredNote && (
                <HoverPreview
                    note={hoveredNote}
                    position={mousePosition}
                    onClose={() => setHoveredNote(null)}
                />
            )}
        </>
    );
}
