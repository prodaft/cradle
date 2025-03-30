import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { FloppyDisk, Trash } from 'iconoir-react/regular';
import NavbarDropdown from '../NavbarDropdown/NavbarDropdown';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import {
    addFleetingNote,
    deleteFleetingNote,
    getFleetingNoteById,
    saveFleetingNoteAsFinal,
    updateFleetingNote,
} from '../../services/fleetingNotesService/fleetingNotesService';
import { displayError } from '../../utils/responseUtils/responseUtils';

import TextEditor from '../TextEditor/TextEditor';
import { useHotkeys } from 'react-hotkeys-hook';
import { keymap } from '@codemirror/view';
import NavbarSwitch from '../NavbarSwitch/NavbarSwitch';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { useModal } from '../../contexts/ModalContext/ModalContext';

export default function FleetingNoteEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const [fileData, setFileData] = useState([]);
    const [publishable, setPublishable] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(saving);

    const markdownContentRef = useRef(markdownContent);
    const fileDataRef = useRef(fileData);

    const textEditorRef = useRef(null);
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const { refreshFleetingNotes } = useOutletContext();
    const { id } = useParams();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
    const [editorExtensions, setEditorExtensions] = useState([]);
    const prevIdRef = useRef(null);
    const { setModal } = useModal();

    // Ensure the ref to the markdown content is correct
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    // Ensure the ref to the file data is correct
    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    // Ensure the ref to saving is correct
    useEffect(() => {
        savingRef.current = saving;
    }, [saving]);

    const NEW_NOTE_PLACEHOLDER_ID = 'new';

    const isValidContent = useCallback(() => {
        return (
            markdownContentRef.current && markdownContentRef.current.trim().length > 0
        );
    }, []);

    const validateContent = useCallback(() => {
        if (isValidContent()) {
            return true;
        } else {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
    }, [isValidContent, setAlert]);

    useEffect(() => {
        if (id) {
            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                setMarkdownContent('');
                setFileData([]);
                setHasUnsavedChanges(true);
                prevIdRef.current = NEW_NOTE_PLACEHOLDER_ID;
            } else {
                if (id === prevIdRef.current) return;
                getFleetingNoteById(id)
                    .then((response) => {
                        setMarkdownContent(response.data.content);
                        setFileData(response.data.files);
                        setHasUnsavedChanges(false);
                    })
                    .catch(displayError(setAlert, navigate));
            }
        }
    }, [id, setMarkdownContent, setFileData, setHasUnsavedChanges, setAlert, navigate]);

    const handleSaveNote = (displayAlert) => {
        setSaving(true);
        if (!validateContent()) return;
        if (savingRef.current) return;
        if (id) {
            const storedContent = markdownContentRef.current;
            const storedFileData = fileDataRef.current;

            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                // Entity for new notes
                addFleetingNote(storedContent, storedFileData)
                    .then((res) => {
                        if (res.status === 200) {
                            refreshFleetingNotes();
                            setHasUnsavedChanges(false);
                            // Set previous id as the one from the response to avoid re-fetching the note
                            prevIdRef.current = res.data.id;
                            navigate(`/editor/${res.data.id}`);
                        }
                    })
                    .catch(displayError(setAlert, navigate))
                    .finally(() => setSaving(false));
            } else {
                // Entity for existing fleeting notes
                updateFleetingNote(id, storedContent, storedFileData)
                    .then((response) => {
                        if (response.status === 200) {
                            setHasUnsavedChanges(false);
                            if (displayAlert) {
                                setAlert({
                                    show: true,
                                    message: displayAlert,
                                    color: 'green',
                                });
                            }
                        }
                        refreshFleetingNotes();
                    })
                    .catch(displayError(setAlert, navigate))
                    .finally(() => setSaving(false));
                setSaving(false);
            }
        }
    };

    // Function to delete a fleeting note you are working on
    const handleDeleteNote = () => {
        if (id) {
            deleteFleetingNote(id)
                .then((response) => {
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'Note deleted successfully.',
                            color: 'green',
                        });
                        refreshFleetingNotes();
                        // Navigate to new note page on deletion
                        navigate('/editor/new');
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    // Function to make final note
    const handleMakeFinal = () => {
        if (!validateContent()) return;
        if (id) {
            saveFleetingNoteAsFinal(id, publishable)
                .then((response) => {
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'Note finalized successfully.',
                            color: 'green',
                        });
                        refreshFleetingNotes();
                        // Navigate to new note page on deletion
                        navigate(`/notes/${response.data.id}`, { replace: true });
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    useEffect(() => {
        const saveKeymap = keymap.of([
            {
                key: 'Mod-s',
                preventDefault: true,
                run: () => {
                    handleSaveNote('Changes saved successfully.');
                    return true;
                },
            },
        ]);

        setEditorExtensions([saveKeymap]);
    }, [id]);

    // For non-editor parts of the app
    useHotkeys(
        'ctrl+s, cmd+s',
        (event) => {
            event.preventDefault();
            handleSaveNote('Changes saved successfully.');
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [id],
    );

    useEffect(() => {
        if (!isValidContent()) return;

        // If we changed the ID, skip the immediate autosave
        if (prevIdRef.current !== id) {
            prevIdRef.current = id;
            return;
        }

        setHasUnsavedChanges(true);
        const autosaveTimer = setTimeout(() => {
            handleSaveNote('');
        }, autoSaveDelay);

        return () => {
            clearTimeout(autosaveTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markdownContent, fileData]);

    useEffect(() => {
        return () => {
            prevIdRef.current = null;
        };
    }, []);

    useNavbarContents(
        id !== NEW_NOTE_PLACEHOLDER_ID && [
            <NavbarSwitch
                key='editor-publishable-switch'
                text={'Publishable'}
                checked={publishable}
                onChange={(e) => setPublishable(e.target.checked)}
            />,
            <NavbarButton
                key='editor-save-btn'
                icon={<FloppyDisk />}
                text={'Save As Final'}
                onClick={handleMakeFinal}
            />,
            <NavbarButton
                key='editor-delete-btn'
                icon={<Trash />}
                text={'Delete'}
                onClick={() =>
                    setModal(ConfirmDeletionModal, {
                        text: `Are you sure you want to delete this fleeting note?`,
                        onConfirm: handleDeleteNote,
                    })
                }
            />,
        ],
        [auth, id, publishable],
    );

    return (
        <>
            <div className='w-full h-full p-1.5 relative' ref={textEditorRef}>
                <TextEditor
                    noteid={id}
                    markdownContent={markdownContent}
                    setMarkdownContent={setMarkdownContent}
                    fileData={fileData}
                    setFileData={setFileData}
                    editorExtensions={editorExtensions}
                />
                <div className='absolute bottom-4 right-8 px-2 py-1 rounded-md backdrop-blur-lg backdrop-filter bg-cradle3 bg-opacity-50 shadow-lg text-zinc-300'>
                    {isValidContent()
                        ? hasUnsavedChanges
                            ? saving
                                ? 'Saving'
                                : 'Changes Not Saved'
                            : 'Saved'
                        : 'Cannot Save Empty Note'}
                </div>
                <AlertDismissible alert={alert} setAlert={setAlert} />
            </div>
        </>
    );
}
