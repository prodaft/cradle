import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import useLightMode from '../../hooks/useLightMode/useLightMode';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { FloppyDisk, Trash } from 'iconoir-react/regular';
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
import { useLocalStorage } from '@uidotdev/usehooks';

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
 * @returns {TextEditor}
 * @constructor
 */
export default function TextEditor() {
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
    const prevIdRef = useRef(id);
    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);

    const NEW_NOTE_PLACEHOLDER_ID = 'new';
    const AUTO_SAVE_DELAY = 2000;

    useEffect(() => {
        parseContent(markdownContent, fileData)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert, navigate));
    }, [markdownContent, fileData, setParsedContent, setAlert, navigate]);

    useEffect(() => {
        if (id) {
            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                setMarkdownContent('');
                setFileData([]);
                setHasUnsavedChanges(true);
            } else {
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

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    const isValidContent = () => {
        if (!markdownContentRef.current) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
        return true;
    };

    const handleSaveNote = (displayAlert) => {
        if (!isValidContent()) return;
        if (id) {
            const storedContent = markdownContentRef.current;
            const storedFileData = fileDataRef.current;

            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                addFleetingNote(storedContent, storedFileData)
                    .then((res) => {
                        if (res.status === 200) {
                            // Clear local storage on success
                            refreshFleetingNotes();
                            setMarkdownContent('');
                            setFileData([]);
                            navigate(`/editor/${res.data.id}`);
                        }
                    })
                    .catch(displayError(setAlert, navigate));
            } else {
                updateFleetingNote(id, storedContent, storedFileData)
                    .then((response) => {
                        if (displayAlert && response.status === 200) {
                            setAlert({
                                show: true,
                                message: displayAlert,
                                color: 'green',
                            });
                        }
                        refreshFleetingNotes();
                    })
                    .catch(displayError(setAlert, navigate));
            }
        }
    };

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
                        navigate('/');
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    const handleMakeFinal = (publishable) => () => {
        if (!isValidContent()) return;
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
                        navigate('/');
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    // Autosave feature
    useEffect(() => {
        if (!markdownContentRef.current) return;

        // Avoid starting autosave when id changes
        if (prevIdRef.current !== id) {
            prevIdRef.current = id;
            return;
        }

        console.log('Setting autosave timer');
        setHasUnsavedChanges(true);
        const autosaveTimer = setTimeout(() => {
            handleSaveNote();
            setHasUnsavedChanges(false);
        }, AUTO_SAVE_DELAY);

        return () => {
            console.log('Clearing autosave timer');
            clearTimeout(autosaveTimer);
        };
    }, [markdownContent, fileData]);

    useNavbarContents(
        [
            id !== NEW_NOTE_PLACEHOLDER_ID && [
                <NavbarButton
                    icon={<Trash />}
                    text={'Delete'}
                    onClick={() => setDialog(true)}
                />,
                <NavbarDropdown
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
            ],
            <NavbarButton
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
                <div className='absolute bottom-4 right-4 px-4 py-2 rounded-md backdrop-blur-lg backdrop-filter bg-cradle3 bg-opacity-50 shadow-lg'>
                    {hasUnsavedChanges ? 'Changes Not Saved' : 'Saved'}
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
                    />
                </div>
                <div
                    className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md`}
                >
                    <Preview htmlContent={parsedContent} />
                </div>
            </div>
        </>
    );
}
