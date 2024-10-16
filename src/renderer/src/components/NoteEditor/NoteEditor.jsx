import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
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
import { updateNote } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { FloppyDiskArrowIn } from 'iconoir-react';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { getNote } from '../../services/notesService/notesService';

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
export default function NoteEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const markdownContentRef = useRef(markdownContent);
    const textEditorRef = useRef(null);
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const isLightMode = useLightMode();
    const { id } = useParams();
    const [fileData, setFileData] = useState([]);
    const fileDataRef = useRef(fileData);
    const [parsedContent, setParsedContent] = useState('');
    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);
    const [previewCollapsed, setPreviewCollapsed] = useState(
        localStorage.getItem('preview.collapse') === 'true',
    );

    // When the contents change update the preview
    useEffect(() => {
        parseContent(markdownContent, fileData)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert, navigate));
    }, [markdownContent, fileData, setParsedContent, setAlert, navigate]);

    // When the id changes prepare the editor
    useEffect(() => {
        getNote(id)
            .then((response) => {
                console.log(response.data);
                setMarkdownContent(response.data.content);
                setFileData(response.data.files);
            })
            .catch(displayError(setAlert, navigate));
    }, [id, setMarkdownContent, setFileData, setAlert, navigate]);

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

        const storedContent = markdownContentRef.current;
        const storedFileData = fileDataRef.current;

        updateNote(id, { content: storedContent, files: storedFileData })
            .then((response) => {
                if (response.status === 200) {
                    if (displayAlert) {
                        setAlert({
                            show: true,
                            message: displayAlert,
                            color: 'green',
                        });
                    }
                    navigate(`/notes/${response.data.id}`);
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const previewCollapseUpdated = (collapsed) => {
        setPreviewCollapsed(collapsed);
        localStorage.setItem('preview.collapse', collapsed);
    };

    // Autosave feature
    useEffect(() => {}, [markdownContent, fileData]);

    // On component dismount reset the prevIdRef
    useEffect(() => {
        return () => {};
    }, []);

    // Use utilities for navbar contents
    // Set the id as dependency
    useNavbarContents(
        [
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
            <div
                className={`w-full h-full rounded-md flex p-1.5 gap-1.5 ${flexDirection === 'flex-col' ? 'flex-col' : 'flex-row'} overflow-y-hidden relative`}
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
