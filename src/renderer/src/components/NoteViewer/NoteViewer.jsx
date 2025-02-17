import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import {
    deleteNote,
    getNote,
    setPublishable,
} from '../../services/notesService/notesService';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { ClockRotateRight, Code, EditPencil } from 'iconoir-react';
import NavbarButton from '../NavbarButton/NavbarButton';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Trash, StatsReport } from 'iconoir-react/regular';
import NavbarSwitch from '../NavbarSwitch/NavbarSwitch';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import useAuth from '../../hooks/useAuth/useAuth';
import ReferenceTree from '../ReferenceTree/ReferenceTree';

/**
 * NoteViewer component
 * Fetches and displays the content of a note
 * Adds a button to Navbar to toggle between raw and parsed content
 *
 * @function NoteViewer
 * @returns {NoteViewer}
 * @constructor
 */
export default function NoteViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { from, state } = location.state || { from: { pathname: '/' } };
    const [note, setNote] = useState({});
    const [isPublishable, setIsPublishable] = useState(false);
    const [isRaw, setIsRaw] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [parsedContent, setParsedContent] = useState('');
    const [dialog, setDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // <-- Add loading state

    const auth = useAuth();

    useEffect(() => {
        setIsLoading(true);
        getNote(id)
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setIsPublishable(responseNote.publishable);
                return responseNote;
            })
            .then((note) => {
                return parseContent(note.content, note.files).then((parsed) =>
                    setParsedContent(parsed),
                );
            })
            .catch(displayError(setAlert, navigate))
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [id, navigate, setAlert]);

    const toggleView = useCallback(() => {
        setIsRaw((prevIsRaw) => !prevIsRaw);
    }, []);

    useEffect(() => {
        const newNote = { ...note, publishable: isPublishable };
        setNote(newNote);
    }, [isPublishable]);

    const togglePublishable = useCallback(() => {
        setPublishable(id, !isPublishable)
            .then(() => {
                setIsPublishable((prev) => !prev);
            })
            .catch(displayError(setAlert, navigate));
    }, [id, isPublishable]);

    const handleDelete = useCallback(() => {
        deleteNote(id)
            .then(() => {
                if (!state) {
                    navigate(from, { replace: true });
                    return;
                }
                if (!state.notes) {
                    navigate(from, { replace: true, state: state });
                    return;
                }
                const stateNotes = state.notes.filter((note) => note.id !== id);
                const newState = { ...state, notes: stateNotes };
                navigate(from, { replace: true, state: newState });
            })
            .catch(displayError(setAlert, navigate));
    }, [id, navigate]);

    const navbarContents = id?.startsWith("guide_") ? [] : [
        isPublishable && (
            <NavbarButton
                icon={<StatsReport />}
                text='Publish Report'
                data-testid='publish-btn'
                key='publish-btn'
                onClick={() => navigate(`/publish`, { state: { noteIds: [id] } })}
            />
        ),
        <NavbarSwitch
            key='publishable-btn'
            text='Publishable'
            checked={isPublishable}
            onChange={togglePublishable}
            testid='publishable-btn'
        />,
        <NavbarButton
            key='edit-btn'
            text='Edit Note'
            icon={<EditPencil />}
            onClick={() => navigate(`/notes/${id}/edit`)}
            tesid='delete-btn'
        />,
        auth.isAdmin() && (
            <NavbarButton
                key='history-btn'
                text='View History'
                icon={<ClockRotateRight />}
                onClick={() => navigate(`/activity?content_type=note&object_id=${id}`)}
                tesid='delete-btn'
            />
        ),
        <NavbarButton
            key='delete-btn'
            text='Delete Note'
            icon={<Trash />}
            onClick={() => setDialog(true)}
            tesid='delete-btn'
        />,
    ];

    navbarContents.push(
        <NavbarButton
            key='toggle-view-btn'
            text='Toggle View'
            icon={<Code />}
            onClick={toggleView}
            tesid='toggle-view-btn'
        />);

    useNavbarContents(navbarContents, [
        toggleView,
        id,
        isPublishable,
        togglePublishable,
        handleDelete,
        dialog,
        setDialog,
        alert,
        setAlert,
    ]);

    // Conditionally render spinner or component
    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full w-full py-8'>
                <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900' />
            </div>
        );
    }

    return (
        <>
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title={'Confirm Deletion'}
                description={'This is permanent'}
                handleConfirm={handleDelete}
            />
            <AlertDismissible
                alert={alert}
                setAlert={setAlert}
                onClose={() => setAlert('')}
            />
            <div className='w-full h-full overflow-hidden flex flex-col items-center px-4 pb-4 pt-1'>
                <div className='h-full w-[90%] rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter px-4 pb-4 pt-1 overflow-y-auto'>
                    <div className='text-sm text-zinc-500 p-2 border-b-2 dark:border-b-zinc-800'>
                        <span className='text-sm text-zinc-500 p-2'>
                            <strong>Created on:</strong>{' '}
                            {new Date(note.timestamp).toLocaleString()}
                        </span>
                        <span className='text-sm text-zinc-700'>|</span>
                        <span className='text-sm text-zinc-500 p-2'>
                            <strong>Created by:</strong>{' '}
                            {note?.author ? note.author.username : 'Unknown'}
                        </span>
                        {note.editor && (
                            <span>
                                <span className='text-sm text-zinc-700'>|</span>
                                <span className='text-sm text-zinc-500 p-2'>
                                    <strong>Edited on:</strong>{' '}
                                    {new Date(note.edit_timestamp).toLocaleString()}
                                </span>
                                <span className='text-sm text-zinc-700'>|</span>
                                <span className='text-sm text-zinc-500 p-2'>
                                    <strong>Edited by:</strong>{' '}
                                    {note?.editor ? note.editor.username : 'Unknown'}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className='flex-grow'>
                        {isRaw ? (
                            <pre
                                className='h-full w-full p-4 bg-transparent prose max-w-none dark:prose-invert break-all
                       overflow-y-auto rounded-lg flex-1 overflow-x-hidden whitespace-pre-wrap'
                            >
                                {note.content}
                            </pre>
                        ) : (
                            <div className='mt-2'>
                                <ReferenceTree note={note} setAlert={setAlert} />
                                <Preview htmlContent={parsedContent} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
