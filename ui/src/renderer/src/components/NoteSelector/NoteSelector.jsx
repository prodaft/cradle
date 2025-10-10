import { useDroppable } from '@dnd-kit/core';
import { Search } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';

import AlertDismissible from '../AlertDismissible/AlertDismissible';
import DraggableNote from '../DraggableNote/DraggableNote';
import AddNote from '../NoteActions/AddNote';
import Pagination from '../Pagination/Pagination';

import { searchNote } from '../../services/notesService/notesService';

export default function NoteSelector({
    selectedNotes,
    setSelectedNotes,
    notes,
    setNotes,
    activeNote,
    setAlert,
}) {
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { setNodeRef } = useDroppable({ id: 'note-selector' });

    const [searchFilters, setSearchFilters] = useState({
        content: '',
        author__username: '',
        truncate: -1,
    });

    const [submittedFilters, setSubmittedFilters] = useState({
        publishable: true,
        content: '',
        author__username: '',
        truncate: -1,
    });

    const fetchNotes = useCallback(() => {
        setLoading(true);
        searchNote({ page, ...submittedFilters })
            .then((response) => {
                setNotes(response.data.results);
                setTotalPages(response.data.total_pages);
                setLoading(false);
            })
            .catch(() => {
                setAlert({
                    show: true,
                    message: 'Failed to fetch notes. Please try again.',
                    color: 'red',
                });
                setLoading(false);
            });
    }, [page, submittedFilters, setNotes, setAlert]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSubmittedFilters(searchFilters);
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    useEffect(() => {
        setSearchFilters({
            content: '',
            author__username: '',
            truncate: -1,
        });
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const isNoteSelected = (noteId) => {
        return selectedNotes.some((note) => note.id === noteId);
    };

    return (
        <div
            ref={setNodeRef}
            className='w-full h-full flex justify-center items-center overflow-y-scroll overflow-x-hidden'
        >
            <div className='w-full max-w-6xl h-full flex flex-col p-6 space-y-3 min-w-0'>
                <AlertDismissible
                    alert={{ show: false, message: '', color: 'red' }}
                    setAlert={setAlert}
                />

                <form
                    onSubmit={handleSearchSubmit}
                    className='flex flex-col sm:flex-row gap-4 px-3 pb-2 w-full min-w-0'
                >
                    <input
                        type='text'
                        name='content'
                        value={searchFilters.content}
                        onChange={handleSearchChange}
                        placeholder='Search by content'
                        className='input flex-1 min-w-0'
                    />
                    <input
                        type='text'
                        name='author__username'
                        value={searchFilters.author__username}
                        onChange={handleSearchChange}
                        placeholder='Search by author'
                        className='input flex-1 min-w-0'
                    />
                    <button type='submit' className='btn flex-shrink-0 whitespace-nowrap'>
                        <Search /> Search
                    </button>
                </form>

                <div className='w-full min-w-0'>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>

                <div>
                    <div className='flex flex-col space-y-4'>
                        {loading ? (
                            <div className='flex items-center justify-center min-h-screen'>
                                <div className='spinner-dot-pulse'>
                                    <div className='spinner-pulse-dot'></div>
                                </div>
                            </div>
                        ) : notes.length > 0 ? (
                            <div className='notes-list w-full min-w-0'>
                                {notes.map(
                                    (note) =>
                                        !isNoteSelected(note.id) && (
                                            <DraggableNote
                                                id={note.id}
                                                key={note.id}
                                                note={note}
                                                setAlert={setAlert}
                                                ghost={
                                                    activeNote &&
                                                    activeNote.id === note.id
                                                }
                                                actions={[
                                                    {
                                                        Component: AddNote,
                                                        props: { setSelectedNotes },
                                                    },
                                                ]}
                                            />
                                        ),
                                )}
                            </div>
                        ) : (
                            <div className='container mx-auto flex flex-col items-center'>
                                <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                                    No notes found!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className='h-16'></div>
            </div>
        </div>
    );
}
