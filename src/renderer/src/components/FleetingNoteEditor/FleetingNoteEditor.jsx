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
 * FleetingNoteEditor component - This component is used to edit a Fleeting Note.
 * The component contains the following features:
 * - Text Editor
 * - Preview
 * - Save as final button
 * - Save button
 * - Delete button
 * The component uses the Markdown syntax to edit the content of the note.
 * The component uses the Fleeting Notes service to save and delete notes.
 *
 * @returns {FleetingNoteEditor}
 * @constructor
 */
export default function FleetingNoteEditor() {
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
    const [fileData, setFileData] = useLocalStorage(`file-data-${id}`, []);
    const fileDataRef = useRef(fileData);
    const [parsedContent, setParsedContent] = useState('');

    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);

    useEffect(() => {
        parseContent(markdownContent, fileData)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert));
    }, [markdownContent, fileData]);

    useEffect(() => {
        if (id) {
            // Fetch note from server
            getFleetingNoteById(auth.access, id)
                .then((response) => {
                    setMarkdownContent(response.data.content);
                    setFileData(response.data.files);
                })
                .catch(displayError(setAlert));
        }
    }, [id]);

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

    const handleSaveNote = () => {
        if (!isValidContent()) return;
        if (id) {
            const storedContent = markdownContentRef.current;
            const storedFileData = fileDataRef.current;

            updateFleetingNote(auth.access, id, storedContent, storedFileData)
                .then((response) => {
                    if (response.status === 200) {
                        setAlert({
                            show: true,
                            message: 'Changes saved successfully.',
                            color: 'green',
                        });
                        refreshFleetingNotes();
                    }
                })
                .catch(displayError(setAlert));
        }
    };

    const handleDeleteNote = () => {
        if (id) {
            deleteFleetingNote(auth.access, id)
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
                .catch(displayError(setAlert));
        }
    };

    const handleMakeFinal = (publishable) => () => {
        if (!isValidContent()) return;
        if (id) {
            saveFleetingNoteAsFinal(auth.access, id, publishable)
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
                .catch(displayError(setAlert));
        }
    };

    useNavbarContents(
        [
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
            <NavbarButton
                icon={<FloppyDisk />}
                text={'Save'}
                onClick={handleSaveNote}
            />,
            <NavbarButton
                icon={<Trash />}
                text={'Delete'}
                onClick={() => setDialog(true)}
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
                className={`w-full h-full rounded-md flex p-1.5 gap-1.5 ${flexDirection === 'flex-col' ? 'flex-col' : 'flex-row'} overflow-y-hidden`}
                ref={textEditorRef}
            >
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
