import { useDroppable } from '@dnd-kit/core';
import { Search } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';

import { useNotif } from '@/contexts/ui/NotificationContext';
import useApi from '@/hooks/api/useApi';
import DraggableNote from '../DraggableNote/DraggableNote';
import AddNote from '../NoteActions/AddNote';
import Pagination from '../Pagination/Pagination';

export default function NoteSelector({
    selectedNotes,
    setSelectedNotes,
    notes,
    setNotes,
    activeNote,
}) {
    // Handle case where component is used as a standalone route component
    const [internalNotes, setInternalNotes] = useState([]);
    const [internalSelectedNotes, setInternalSelectedNotes] = useState([]);
    const { notify } = useNotif();

    // Use provided props or fall back to internal state
    const finalNotes = notes || internalNotes;
    const finalSetNotes = setNotes || setInternalNotes;
    const finalSelectedNotes = selectedNotes || internalSelectedNotes;
    const finalSetSelectedNotes = setSelectedNotes || setInternalSelectedNotes;
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { notesApi } = useApi();

    const { setNodeRef } = useDroppable({ id: 'note-selector' });

    const [searchFilters, setSearchFilters] = useState({
        content: '',
        author__username: '',
        truncate: -1,
    });

    const [submittedFilters, setSubmittedFilters] = useState({
        content: '',
        author__username: '',
        truncate: -1,
    });

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                content: submittedFilters.content,
                authorUsername: submittedFilters.author__username,
                truncate: submittedFilters.truncate,
            };
            // Remove undefined values
            Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

            const response = await notesApi.notesList(params);
            finalSetNotes(response.results);
            setTotalPages(response.totalPages);
            setLoading(false);
        } catch (error) {
            notify({
                type: 'error',
                text: 'Failed to fetch notes. Please try again.',
            });
            setLoading(false);
        }
    }, [page, submittedFilters, finalSetNotes, notify, notesApi]);

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
        return finalSelectedNotes.some((note) => note.id === noteId);
    };

    return (
        <div
            ref={setNodeRef}
            className='w-full h-full flex justify-center items-center overflow-y-scroll overflow-x-hidden'
        >
            <div className='w-full max-w-6xl h-full flex flex-col p-6 space-y-3 min-w-0'>
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
                        ) : finalNotes.length > 0 ? (
                            <div className='notes-list w-full min-w-0'>
                                {finalNotes.map(
                                    (note) =>
                                        !isNoteSelected(note.id) && (
                                            <DraggableNote
                                                id={note.id}
                                                key={note.id}
                                                note={note}
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
