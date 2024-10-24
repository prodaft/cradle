import { useState, useEffect, useCallback } from 'react';
import DashboardNote from '../DashboardNote/DashboardNote';
import { searchNote } from '../../services/notesService/notesService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function NotesList({ query }) {
    const [notes, setNotes] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

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
        fetchNotes();
    }, [fetchNotes]);

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='flex flex-col space-y-4'>
                {loading ? (
                    <p></p>
                ) : notes.length > 0 ? (
                    <div>
                        <div className='notes-list'>
                            {notes.map((note, index) => (
                                <DashboardNote
                                    key={index}
                                    note={note}
                                    setAlert={setAlert}
                                />
                            ))}
                        </div>

                        <div className='pagination flex justify-center mt-4 mb-4'>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePageChange(index + 1)}
                                    disabled={page === index + 1}
                                    className={`btn ${page === index + 1 ? 'btn-disabled' : ''}`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className='container mx-auto flex flex-col items-center'>
                        <p className='mt-6 !text-sm !font-normal text-zinc-500'>
                            No notes found!
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
