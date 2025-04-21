import { useState, useEffect, useCallback } from 'react';
import Note from '../Note/Note';
import { searchNote } from '../../services/notesService/notesService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Pagination from '../Pagination/Pagination';
import { useSearchParams } from 'react-router-dom';
import { useDroppable } from '@dnd-kit/core';
import AlertBox from '../AlertBox/AlertBox';

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
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

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
        setPage(Number(searchParams.get('page')) || 1);
        fetchNotes();
    }, [fetchNotes]);

    const handlePageChange = (newPage) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', newPage);
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
                            {notes.map((note, index) => {
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
                            })}
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
        </>
    );
}
