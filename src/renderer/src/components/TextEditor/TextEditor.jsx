import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import useLightMode from '../../hooks/useLightMode/useLightMode';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { FloppyDisk, Trash, NavArrowLeft } from 'iconoir-react/regular';
import NavbarDropdown from '../NavbarDropdown/NavbarDropdown';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Editor from '../Editor/Editor';
import Preview from '../Preview/Preview';
import useChangeFlexDirectionBySize from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
import {
    addFleetingNote,
    deleteFleetingNote,
    getFleetingNoteById,
    saveFleetingNoteAsFinal,
    updateFleetingNote,
} from '../../services/fleetingNotesService/fleetingNotesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { FloppyDiskArrowIn } from 'iconoir-react';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';

/**
 * Component for creating new Notes and editing existing fleeting Notes.
 * The component contains the following features:
 * - Text Editor
 * - Preview
 * - Save as final button (only for existing fleeting notes)
 * - Save button
 * - Delete button (only for existing fleeting notes)
 * The component auto-saves the note two seconds after the user stops typing:
 *      - When creating a new note, the component saves the note as a fleeting note.
 *      - When editing an existing fleeting note, the component updates the note.
 *
 * @function TextEditor
 * @param {Object} props
 * @param {number} [props.autoSaveDelay=1000] - The delay in milliseconds before auto-saving the note
 * @returns {TextEditor}
 * @constructor
 */
export default function TextEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const markdownContentRef = useRef(markdownContent);
    const textEditorRef = useRef(null);
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const isLightMode = useLightMode();
    const { refreshFleetingNotes } = useOutletContext();
    const [dialog, setDialog] = useState(false);
    const { id } = useParams();
    const [fileData, setFileData] = useState([]);
    const fileDataRef = useRef(fileData);
    const [parsedContent, setParsedContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
    const [previewCollapsed, setPreviewCollapsed] = useState(
        localStorage.getItem('preview.collapse') === 'true',
    );
    const prevIdRef = useRef(null);
    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);

    const NEW_NOTE_PLACEHOLDER_ID = 'new';

    // When the contents change update the preview
    useEffect(() => {
        parseContent(markdownContent, fileData)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert, navigate));
    }, [markdownContent, fileData, setParsedContent, setAlert, navigate]);

    // When the id changes prepare the editor
    useEffect(() => {
        if (id) {
            // When the editor is on the 'new' path clear contents to prepare for new note creation
            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                //clear contents
                setMarkdownContent('');
                setFileData([]);
                setHasUnsavedChanges(true);
                //ensure the previous note id is reset
                prevIdRef.current = NEW_NOTE_PLACEHOLDER_ID;
            } else {
                // Check that if the last page  you were on is the same as the one you are now
                // If you navigate again to the same page don't re-fetch data
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

    // Ensure the ref to the markdown content is correct
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    // Ensure the ref to the file data is correct
    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    // Function to check if the contents represent a valid note
    const isValidContent = () => {
        return markdownContentRef.current && markdownContentRef.current.trim();
    };

    // Function that checks if contents are valid and display error in entity not
    const validateContent = () => {
        if (isValidContent()) {
            return true;
        } else {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
    };

    // Function to save a note
    // If the note you are working on is on the 'new' path create new fleeting note
    // If the note has an id update the fleeting note
    const handleSaveNote = (displayAlert) => {
        if (!validateContent()) return;
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
                    .catch(displayError(setAlert, navigate));
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
                    .catch(displayError(setAlert, navigate));
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
    const handleMakeFinal = (publishable) => () => {
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
                        navigate('/editor/new', { replace: true });
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    // Autosave feature
    useEffect(() => {
        // If the content is not valid do not attempt to save
        if (!isValidContent()) return;

        // Avoid starting autosave when id changes (new page navigation)
        // Additionally set the prev id correctly
        if (prevIdRef.current !== id) {
            prevIdRef.current = id;
            return;
        }

        // Set the unsaved changes flag to true
        setHasUnsavedChanges(true);
        // Start the timer for autosave
        const autosaveTimer = setTimeout(() => {
            handleSaveNote('');
        }, autoSaveDelay);

        // In entity there are new changes detected reset the timer
        return () => {
            clearTimeout(autosaveTimer);
        };
    }, [markdownContent, fileData]);

    // On component dismount reset the prevIdRef
    useEffect(() => {
        return () => {
            prevIdRef.current = null;
        };
    }, []);

    const previewCollapseUpdated = (collapsed) => {
        console.log('TEST');
        setPreviewCollapsed(collapsed);
        localStorage.setItem('preview.collapse', collapsed);
    };

    // Use utilities for navbar contents
    // Set the id as dependency
    useNavbarContents(
        id !== NEW_NOTE_PLACEHOLDER_ID && [
            <NavbarButton
                key='editor-delete-btn'
                icon={<Trash />}
                text={'Delete'}
                onClick={() => setDialog(true)}
            />,
            <NavbarDropdown
                key='editor-save-final-btn'
                icon={<FloppyDiskArrowIn />}
                text={'Save As Final'}
                contents={[
                    {
                        label: 'Publishable',
                        handler: handleMakeFinal(true),
                    },
                    {
                        label: 'Not Publishable',
                        handler: handleMakeFinal(false),
                    },
                ]}
            />,
            <NavbarButton
                key='editor-save-btn'
                icon={<FloppyDisk />}
                text={'Save'}
                onClick={() => handleSaveNote('Changes saved successfully.')}
            />,
        ],
        [auth, id],
    );

    return (
        <>
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title={'Confirm Deletion'}
                description={'This is permanent'}
                handleConfirm={handleDeleteNote}
            />
            <div
                className={`w-full h-full rounded-md flex p-1.5 gap-1.5 ${flexDirection === 'flex-col' ? 'flex-col' : 'flex-row'} overflow-y-hidden relative`}
                ref={textEditorRef}
            >
                <div className='absolute bottom-4 right-8 px-2 py-1 rounded-md backdrop-blur-lg backdrop-filter bg-cradle3 bg-opacity-50 shadow-lg text-zinc-300'>
                    {isValidContent()
                        ? hasUnsavedChanges
                            ? 'Changes Not Saved'
                            : 'Saved'
                        : 'Cannot Save Empty Note'}
                </div>
                <AlertDismissible alert={alert} setAlert={setAlert} />
                <div
                    className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md`}
                >
                    <Editor
                        markdownContent={markdownContent}
                        setMarkdownContent={setMarkdownContent}
                        isLightMode={isLightMode}
                        fileData={fileData}
                        setFileData={setFileData}
                        viewCollapsed={previewCollapsed}
                        setViewCollapsed={previewCollapseUpdated}
                    />
                </div>
                {!previewCollapsed && (
                    <div
                        className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md`}
                    >
                        <Preview htmlContent={parsedContent} />
                    </div>
                )}
            </div>
        </>
    );
}
