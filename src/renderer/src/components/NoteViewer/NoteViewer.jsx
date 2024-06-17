import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth/useAuth';
import {
    deleteNote,
    getNote,
    setPublishable,
} from '../../services/notesService/notesService';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { Code } from 'iconoir-react';
import NavbarButton from '../NavbarButton/NavbarButton';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Trash } from 'iconoir-react/regular';
import NavbarSwitch from '../NavbarSwitch/NavbarSwitch';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';

/**
 * NoteViewer component
 * Fetches and displays the content of a note
 * Adds a button to Navbar to toggle between raw and parsed content
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
    const auth = useAuth();
    const [parsedContent, setParsedContent] = useState('');
    const [dialog, setDialog] = useState(false);

    useEffect(() => {
        getNote(auth.access, id)
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setIsPublishable(responseNote.publishable);
                return responseNote;
            })
            .then((note) => {
                parseContent(note.content, note.files)
                    .then((parsedContent) => setParsedContent(parsedContent))
                    .catch(displayError(setAlert));
            })
            .catch(displayError(setAlert));
    }, [auth.access, id]);

    const toggleView = useCallback(() => {
        setIsRaw((prevIsRaw) => !prevIsRaw);
    }, []);

    useEffect(() => {
        const newNote = { ...note, publishable: isPublishable };
        setNote(newNote);
    }, [isPublishable]);

    const togglePublishable = useCallback(() => {
        setPublishable(auth.access, id, !isPublishable)
            .then(() => {
                setIsPublishable((prevIsPublishable) => !prevIsPublishable);
            })
            .catch(displayError(setAlert));
    }, [auth.access, id, isPublishable]);

    const handleDelete = useCallback(() => {
        deleteNote(auth.access, id)
            .then(() => {
                if (!state) {
                    navigate(from, { replace: true });
                    return;
                }
                if (!state.notes) {
                    navigate(from, { replace: true, state: state });
                    return;
                }
                const stateNotes = state.notes.filter((note) => note.id != id); // todo when id's are uuids change to !==
                const newState = { ...state, notes: stateNotes };
                navigate(from, { replace: true, state: newState });
            })
            .catch(displayError(setAlert));
    }, [auth.access, id, navigate]);

    const navbarContents = [
        <NavbarSwitch
            key='publishable-btn'
            text='Publishable'
            checked={isPublishable}
            onChange={togglePublishable}
            testid='publishable-btn'
        />,
        <NavbarButton
            key='delete-btn'
            text='Delete Note'
            icon={<Trash />}
            onClick={() => setDialog(true)}
            tesid='delete-btn'
        />,
        <NavbarButton
            key='toggle-view-btn'
            text='Toggle View'
            icon={<Code />}
            onClick={toggleView}
            tesid='toggle-view-btn'
        />,
    ];

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
            <div className='w-full h-full overflow-hidden flex flex-col items-center p-4'>
                <div className='h-full w-[90%] rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter p-4 overflow-y-auto'>
                    <div className='text-sm text-zinc-500 p-2'>
                        {new Date(note.timestamp).toLocaleString()}
                    </div>
                    <div className='flex-grow'>
                        {isRaw ? (
                            <pre className='prose dark:prose-invert break-all overflow-x-hidden p-4'>
                                {note.content}
                            </pre>
                        ) : (
                            <Preview htmlContent={parsedContent} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
