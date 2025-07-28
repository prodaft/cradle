import {
    InfoCircleSolid,
    Sort,
    SortDown,
    SortUp,
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
import Note from '../Note/Note';
import DeleteNote from '../NoteActions/DeleteNote';
import EditNote from '../NoteActions/EditNote';
import Pagination from '../Pagination/Pagination';

export default function NotesList({
    query,
    filteredNotes = [],
    noteActions = [],
    references = null,
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [notes, setNotes] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [loading, setLoading] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const { profile } = useProfile();
    const [page, setPage] = useState(Number(searchParams.get('notes_page')) || 1);
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const { navigate, navigateLink } = useCradleNavigate();
    const [hoveredNote, setHoveredNote] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);
    const HOVER_DELAY = 800;

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

    const handleSort = (column) => {
        const newSortField = sortFieldMapping[column];
        if (!newSortField) return;

        if (sortField === newSortField) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // New field, default to descending for timestamp fields, ascending for others
            setSortField(newSortField);
            setSortDirection(newSortField.includes('timestamp') ? 'desc' : 'asc');
        }

        // Reset to first page when sorting changes
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', '1');
        setSearchParams(newParams);
    };

    const getSortIcon = (column, className) => {
        const fieldName = sortFieldMapping[column];
        if (!fieldName || sortField !== fieldName) {
            return <Sort className={className} />;
        }

        return sortDirection === 'desc' ? (
            <SortDown className={className} />
        ) : (
            <SortUp className={className} />
        );
    };

    const fetchNotes = useCallback(() => {
        if (query == null) return;
        setLoading(true);

        const orderBy = sortDirection === 'desc' ? `-${sortField}` : sortField;

        searchNote({
            page_size: profile?.compact_mode ? 20 : 10,
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
    }, [page, sortField, sortDirection, query]);

    useEffect(() => {
        setPage(Number(searchParams.get('notes_page')) || 1);
        fetchNotes();
    }, [fetchNotes]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('notes_page', newPage);
        setSearchParams(newParams);

        setPage(newPage);
    };

    const SortableTableHeader = ({ column, children, className = '' }) => (
        <th
            className={`cursor-pointer select-none ${className}`}
            onClick={() => handleSort(column)}
        >
            <div className='flex items-center justify-between !border-b-0 !border-t-0'>
                <span className='!border-b-0 !border-t-0'>{children}</span>
                {getSortIcon(
                    column,
                    'w-4 h-4 text-zinc-600 dark:text-zinc-400 !border-b-0 !border-t-0',
                )}
            </div>
        </th>
    );

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
                        <div className='flex items-center justify-center min-h-screen'>
                            <div className='spinner-dot-pulse'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        </div>
                    ) : notes.length > 0 ? (
                        <div className='notes-list'>
                            {profile?.compact_mode ? (
                                <div className='overflow-x-auto w-full'>
                                    <table className='table table-hover'>
                                        <thead>
                                            <tr>
                                                <th></th>
                                                <SortableTableHeader column='title'>
                                                    Title
                                                </SortableTableHeader>
                                                <th>Description</th>
                                                <SortableTableHeader column='author'>
                                                    Author
                                                </SortableTableHeader>
                                                <SortableTableHeader column='editor'>
                                                    Editor
                                                </SortableTableHeader>
                                                <SortableTableHeader column='createdAt'>
                                                    Created At
                                                </SortableTableHeader>
                                                <SortableTableHeader column='lastChanged'>
                                                    Updated At
                                                </SortableTableHeader>
                                                <th className='w-16'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {notes.map((note) => {
                                                // Skip filtered notes
                                                for (const n of filteredNotes) {
                                                    if (n.id === note.id) return null;
                                                }

                                                return (
                                                    <tr
                                                        key={note.id}
                                                        className='cursor-pointer'
                                                        onClick={navigateLink(
                                                            `/notes/${note.id}`,
                                                        )}
                                                        onMouseEnter={(e) =>
                                                            handleMouseEnter(note, e)
                                                        }
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        <td className='w-8'>
                                                            {note.status && (
                                                                <span
                                                                    className='inline-flex items-center align-middle tooltip tooltip-right tooltip-primary'
                                                                    data-tooltip={
                                                                        note.status_message ||
                                                                        capitalizeString(
                                                                            note.status,
                                                                        )
                                                                    }
                                                                >
                                                                    {getStatusIcon(
                                                                        note.status,
                                                                    )}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td
                                                            className={`truncate w-64`}
                                                            data-tooltip={
                                                                note.metadata?.title
                                                            }
                                                        >
                                                            {truncateText(
                                                                parseMarkdownInline(
                                                                    note.metadata
                                                                        ?.title,
                                                                ),
                                                                64,
                                                            )}
                                                        </td>
                                                        <td className='truncate max-w-xs'>
                                                            {note.metadata?.description
                                                                ? parseMarkdownInline(
                                                                      note.metadata
                                                                          ?.description,
                                                                  )
                                                                : '-'}
                                                        </td>
                                                        <td className='truncate w-32'>
                                                            {truncateText(
                                                                note.author?.username,
                                                                16,
                                                            )}
                                                        </td>
                                                        <td className='truncate w-32'>
                                                            {truncateText(
                                                                note.editor?.username,
                                                                16,
                                                            )}
                                                        </td>
                                                        <td className='w-36'>
                                                            {formatDate(
                                                                new Date(
                                                                    note.timestamp,
                                                                ),
                                                            )}
                                                        </td>
                                                        <td className='w-36'>
                                                            {note.edit_timestamp
                                                                ? formatDate(
                                                                      new Date(
                                                                          note.edit_timestamp,
                                                                      ),
                                                                  )
                                                                : '-'}
                                                        </td>
                                                        <td className='w-16'>
                                                            <div className='flex items-center space-x-1'>
                                                                <EditNote
                                                                    note={note}
                                                                    setAlert={setAlert}
                                                                    setHidden={() => {}}
                                                                    key={note.id}
                                                                    classNames='w-4 h-4'
                                                                />
                                                                <DeleteNote
                                                                    note={note}
                                                                    setAlert={setAlert}
                                                                    setHidden={() => {}}
                                                                    key={note.id}
                                                                    classNames='w-4 h-4'
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                notes.map((note, index) => {
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
                                })
                            )}
                        </div>
                    ) : (
                        <div className='container mx-auto flex flex-col items-center'>
                            <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                                No notes found!
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
