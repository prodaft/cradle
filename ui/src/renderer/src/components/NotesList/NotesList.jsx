import { useState, useEffect, useCallback, useRef } from 'react';
import Note from '../Note/Note';
import { searchNote } from '../../services/notesService/notesService';
import Pagination from '../Pagination/Pagination';
import { useSearchParams } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import AlertBox from '../AlertBox/AlertBox';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircleSolid,
    InfoCircleSolid,
    WarningTriangleSolid,
    WarningCircleSolid,
} from 'iconoir-react';
import { HoverPreview } from '../HoverPreview/HoverPreview';
import DeleteNote from '../NoteActions/DeleteNote';

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
    const navigate = useNavigate();
    const [hoveredNote, setHoveredNote] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const hoverTimeoutRef = useRef(null);
    const HOVER_DELAY = 800;

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
                return (
                    <CheckCircleSolid
                        className='text-green-500'
                        width='18'
                        height='18'
                    />
                );
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

    const fetchNotes = useCallback(() => {
        setLoading(true);

        searchNote({ page, ...query })
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
    }, [page, query]);

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
                                                <th>Status</th>
                                                <th>Title</th>
                                                <th>Description</th>
                                                <th>Last Changed</th>
                                                <th>Last Editor</th>
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
                                                        onClick={() =>
                                                            navigate(
                                                                `/notes/${note.id}`,
                                                            )
                                                        }
                                                        onMouseEnter={(e) =>
                                                            handleMouseEnter(note, e)
                                                        }
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        <td>
                                                            {note.status && (
                                                                <span
                                                                    className='inline-flex items-center align-middle tooltip tooltip-top'
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
                                                        <td>
                                                            {note.metadata?.title ||
                                                                'Untitled'}
                                                        </td>
                                                        <td className='max-w-xs truncate'>
                                                            {note.metadata
                                                                ?.description || '-'}
                                                        </td>
                                                        <td>
                                                            {note.editor
                                                                ? formatDate(
                                                                      new Date(
                                                                          note.edit_timestamp,
                                                                      ),
                                                                  )
                                                                : formatDate(
                                                                      new Date(
                                                                          note.timestamp,
                                                                      ),
                                                                  )}
                                                        </td>
                                                        <td>
                                                            {note.editor
                                                                ? note.editor.username
                                                                : note.author
                                                                      ?.username ||
                                                                  'Unknown'}
                                                        </td>
                                                        <td className='w-16'>
                                                            <div className='flex items-center space-x-1'>
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
