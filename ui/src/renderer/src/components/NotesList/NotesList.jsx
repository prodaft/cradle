import {
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
    Search,
    Xmark,
    DesignNib,
} from 'iconoir-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { deleteNote, searchNote } from '../../services/notesService/notesService';
import { deleteFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import { parseMarkdownInline } from '../../utils/customParser/customParser';
import {
    capitalizeString,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import ActionBar from '../ActionBar/ActionBar';
import AlertBox from '../AlertBox/AlertBox';
import { HoverPreview } from '../HoverPreview/HoverPreview';
import ListView from '../ListView/ListView';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import Note from '../Note/Note';
import DeleteNote from '../NoteActions/DeleteNote';
import EditNote from '../NoteActions/EditNote';
import Pagination from '../Pagination/Pagination';

export default function NotesList({
    query,
    filteredNotes = [],
    noteActions = [],
    hideActionBar = false,
    forceCardView = false,
    references = null,
    onFilterChange = null,
    contentSearch = null,
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
    const { setModal } = useModal();
    const [hoveredNote, setHoveredNote] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);
    const HOVER_DELAY = 800;
    const [selectedNotes, setSelectedNotes] = useState([]);
    const [pageSize, setPageSize] = useState(
        Number(searchParams.get('notes_pagesize')) ||
        (!forceCardView ? 20 : 10)
    );
    const [columnFilters, setColumnFilters] = useState({
        author: query?.author__username || '',
        editor: query?.editor__username || '',
        createdAt: { 
            from: query?.created_date_from || '', 
            to: query?.created_date_to || '' 
        },
        lastChanged: { 
            from: query?.updated_date_from || '', 
            to: query?.updated_date_to || '' 
        },
    });
    const [searchInputValue, setSearchInputValue] = useState(contentSearch?.value || '');

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

    const handleColumnFilter = (column, value) => {
        setColumnFilters(prev => ({
            ...prev,
            [column]: value,
        }));

        // Notify parent component if callback is provided
        if (onFilterChange) {
            onFilterChange(column, value);
        }
    };

    // Define filterable columns with their handlers
    const filterableColumns = {
        author: (value) => handleColumnFilter('author', value),
        editor: (value) => handleColumnFilter('editor', value),
        createdAt: (value) => handleColumnFilter('createdAt', value),
        lastChanged: (value) => handleColumnFilter('lastChanged', value),
    };

    // Update column filters when query changes
    useEffect(() => {
        setColumnFilters({
            author: query?.author__username || '',
            editor: query?.editor__username || '',
            createdAt: { 
                from: query?.created_date_from || '', 
                to: query?.created_date_to || '' 
            },
            lastChanged: { 
                from: query?.updated_date_from || '', 
                to: query?.updated_date_to || '' 
            },
        });
    }, [query?.author__username, query?.editor__username, query?.created_date_from, query?.created_date_to, query?.updated_date_from, query?.updated_date_to]);

    // Update search input value when contentSearch changes
    useEffect(() => {
        if (contentSearch?.value !== undefined) {
            setSearchInputValue(contentSearch.value);
        }
    }, [contentSearch?.value]);

    const fetchNotes = useCallback(() => {
        if (query == null) return;
        setLoading(true);

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        searchNote({
            ...query,
            page_size: pageSize,
            page,
            order_by: orderBy,
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

    // Define actions for the ActionBar
    const actions = [
        {
            value: 'delete',
            label: 'Delete',
            handler: async (selectedIds) => {
                setModal(ConfirmDeletionModal, {
                    onConfirm: async () => {
                        try {
                            // Send all delete requests in parallel
                            // Use the appropriate delete function based on whether the note is fleeting
                            const deletePromises = selectedIds.map(id => {
                                const note = notes.find(n => n.id === id);
                                if (note && note.fleeting) {
                                    return deleteFleetingNote(id);
                                } else {
                                    return deleteNote(id);
                                }
                            });
                            const results = await Promise.allSettled(deletePromises);

                            // Count successes and failures
                            const successes = results.filter(r => r.status === 'fulfilled').length;
                            const failures = results.filter(r => r.status === 'rejected').length;

                            if (failures === 0) {
                                setAlert({
                                    show: true,
                                    color: 'green',
                                    message: `Successfully deleted ${successes} note${successes > 1 ? 's' : ''}`,
                                });
                            } else if (successes === 0) {
                                setAlert({
                                    show: true,
                                    color: 'red',
                                    message: `Failed to delete ${failures} note${failures > 1 ? 's' : ''}`,
                                });
                            } else {
                                setAlert({
                                    show: true,
                                    color: 'amber',
                                    message: `Deleted ${successes} note${successes > 1 ? 's' : ''}, ${failures} failed`,
                                });
                            }

                            // Refresh the notes list
                            setSelectedNotes([]);
                            fetchNotes();
                        } catch (error) {
                            setAlert({
                                show: true,
                                color: 'red',
                                message: 'An unexpected error occurred while deleting notes',
                            });
                        }
                    },
                    text: `Are you sure you want to delete ${selectedIds.length} note${selectedIds.length > 1 ? 's' : ''}? This action is irreversible.`,
                });
            },
        },
    ];

    const columns = [
        { key: 'status', label: '' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'author', label: 'Author', filterType: 'text' },
        { key: 'editor', label: 'Editor', filterType: 'text' },
        { key: 'createdAt', label: 'Created At', filterType: 'date' },
        { key: 'lastChanged', label: 'Updated At', filterType: 'date' },
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
                    <div className='flex items-center justify-between gap-2'>
                        <span className='truncate'>
                            {truncateText(
                                parseMarkdownInline(note.metadata?.title),
                                64,
                            )}
                        </span>
                        {note.fleeting && (
                            <span
                                className='inline-flex items-center align-middle tooltip tooltip-left tooltip-primary flex-shrink-0'
                                data-tooltip='Fleeting Note'
                            >
                                <DesignNib className='text-[#FF8C00]' width='18' height='18' />
                            </span>
                        )}
                    </div>
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
                            key={`${note.id}-edit`}
                            classNames='w-4 h-4'
                        />
                        <DeleteNote
                            note={note}
                            setAlert={setAlert}
                            setHidden={() => { }}
                            key={`${note.id}-delete`}
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

    return (
        <>
            <div className='flex flex-col space-y-4'>
                <AlertBox alert={alert} setAlert={setAlert} />

                {/* Compact Control Bar - Actions and Pagination */}
                {!loading && (
                    <div className='cradle-card cradle-card-compact'>
                        <div className='cradle-card-body p-3'>
                            <div className='flex flex-wrap items-center justify-between gap-4'>
                                {/* Left: Action Bar and Search */}
                                <div className='flex items-center gap-4 flex-shrink-0'>
                                    {!hideActionBar && (
                                        <div className={`${notes.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <ActionBar
                                                actions={actions}
                                                selectedItems={selectedNotes}
                                                itemLabel='note'
                                            />
                                        </div>
                                    )}

                                    {/* Content Search */}
                                    {contentSearch && (
                                        <div className='flex items-stretch gap-2 min-w-[280px]'>
                                            <div className='relative flex-1'>
                                                <input
                                                    type='text'
                                                    value={searchInputValue}
                                                    onChange={(e) => {
                                                        setSearchInputValue(e.target.value);
                                                        if (contentSearch?.onChange) {
                                                            contentSearch.onChange(e.target.value);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && contentSearch?.onSubmit) {
                                                            contentSearch.onSubmit();
                                                        }
                                                    }}
                                                    placeholder='Search content...'
                                                    className='cradle-search text-sm py-2 px-3 w-full pr-8 h-full'
                                                />
                                                {searchInputValue && (
                                                    <button
                                                        onClick={() => {
                                                            setSearchInputValue('');
                                                            if (contentSearch?.onChange) {
                                                                contentSearch.onChange('');
                                                            }
                                                            if (contentSearch?.onSubmit) {
                                                                contentSearch.onSubmit();
                                                            }
                                                        }}
                                                        className='absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:cradle-bg-secondary rounded '
                                                        title='Clear search'
                                                    >
                                                        <Xmark className='w-4 h-4 cradle-text-tertiary' />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (contentSearch?.onSubmit) {
                                                        contentSearch.onSubmit();
                                                    }
                                                }}
                                                className='cradle-btn cradle-btn-secondary px-3 py-2 hover:cradle-bg-secondary rounded  flex items-center justify-center'
                                                title='Search'
                                            >
                                                <Search className='w-4 h-4' />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Pagination */}
                                <div className={`flex-shrink-0 ${notes.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                </div>
                            </div>
                        </div>
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
                    filterableColumns={filterableColumns}
                    filterValues={columnFilters}
                />
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
