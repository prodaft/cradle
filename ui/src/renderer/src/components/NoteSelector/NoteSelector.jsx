import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'iconoir-react';
import { useDroppable } from '@dnd-kit/core';

import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Pagination from '../Pagination/Pagination';
import DraggableNote from '../DraggableNote/DraggableNote';
import Note from '../Note/Note';
import AddNote from '../NoteActions/AddNote';

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
            className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-scroll'
        >
            <div className='w-[95%] h-full flex flex-col p-6 space-y-3'>
                <AlertDismissible
                    alert={{ show: false, message: '', color: 'red' }}
                    setAlert={setAlert}
                />

                <form
                    onSubmit={handleSearchSubmit}
                    className='flex space-x-4 px-3 pb-2'
                >
                    <input
                        type='text'
                        name='content'
                        value={searchFilters.content}
                        onChange={handleSearchChange}
                        placeholder='Search by content'
                        className='input !max-w-full w-full'
                    />
                    <input
                        type='text'
                        name='author__username'
                        value={searchFilters.author__username}
                        onChange={handleSearchChange}
                        placeholder='Search by author'
                        className='input !max-w-full w-full'
                    />
                    <button type='submit' className='btn w-1/2'>
                        <Search /> Search
                    </button>
                </form>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />

                <div>
                    <div className='flex flex-col space-y-4'>
                        {loading ? (
                            <div className='flex items-center justify-center min-h-screen'>
                                <div className='spinner-dot-pulse'>
                                    <div className='spinner-pulse-dot'></div>
                                </div>
                            </div>
                        ) : notes.length > 0 ? (
                            <div className='notes-list'>
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
