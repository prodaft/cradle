import Editor from '../Editor/Editor';
import Preview from '../Preview/Preview';
import { FloppyDisk } from 'iconoir-react/regular';
import { saveNote } from '../../services/textEditorService/textEditorService.js';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils.js';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth/useAuth.js';
import AlertDismissible from '../AlertDismissible/AlertDismissible.jsx';
import { displayError } from '../../utils/responseUtils/responseUtils.js';
import useLightMode from '../../hooks/useLightMode/useLightMode.js';
import NavbarDropdown from '../NavbarDropdown/NavbarDropdown.jsx';
import { addFleetingNote } from '../../services/fleetingNotesService/fleetingNotesService';
import { useChangeFlexDirectionBySize } from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
import { useLocalStorage } from '@uidotdev/usehooks';

/**
 * The text editor is composed of two subcomponents, the Editor and the Preview. View their documentation for more details
 * The text editor component also contains the save button, which saves the note.
 * The save button is a dropdown button with three options:
 * 1. Save as publishable
 * 2. Save as not publishable
 * 3. Save as fleeting note
 * The save button sends the note to the server and clears the local storage on success.
 * If the note is empty, an error is displayed.
 *
 * This component is reactive to the system light theme.
 *
 * @returns {TextEditor}
 */
export default function TextEditor() {
    const [markdownContent, setMarkdownContentCallback] = useLocalStorage(
        'md-content',
        '',
    );
    const markdownContentRef = useRef(markdownContent);
    const auth = useAuth();
    const [alert, setAlert] = useState('');
    const [alertColor, setAlertColor] = useState('red');
    const navigate = useNavigate();
    const parsedContent = parseContent(markdownContent);
    const isLightMode = useLightMode();
    const [fileData, setFileData] = useLocalStorage('file-data', []);
    const textEditorRef = useRef(null);
    const { refreshFleetingNotes } = useOutletContext();

    // Resize the text editor based on the size of the parent container
    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    const isEmptyNote = () => {
        if (!markdownContentRef.current) {
            setAlertColor('red');
            setAlert('Cannot save empty note');
            return true;
        }
        return false;
    };

    // Open the dialog to save the note. If the note is empty, display an error.
    // Attempt to send the note to the server. If successful, clear the local storage. Otherwise, display the error.
    const handleSaveNote = (publishable) => () => {
        if (isEmptyNote()) return;

        const storedContent = markdownContentRef.current;

        saveNote(auth.access, storedContent, publishable)
            .then((res) => {
                if (res.status === 200) {
                    // Clear local storage on success
                    setMarkdownContentCallback('');
                    setFileData([]);
                    setAlertColor('green');
                    setAlert('Note saved successfully.');
                }
            })
            .catch(displayError(setAlert, setAlertColor));
    };

    const handleSaveFleetingNote = () => {
        if (isEmptyNote()) return;

        const storedContent = markdownContentRef.current;

        addFleetingNote(auth.access, storedContent)
            .then((res) => {
                if (res.status === 200) {
                    // Clear local storage on success
                    refreshFleetingNotes();
                    setMarkdownContentCallback('');
                    setFileData([]);
                    setAlertColor('green');
                    setAlert('Fleeting note saved successfully.');
                    navigate(`/fleeting-editor/${res.data.id}`);
                }
            })
            .catch(displayError(setAlert, setAlertColor));
    };

    // Buttons for the dialog. Label & handler function
    const dropdownButtons = [
        {
            label: 'Publishable',
            handler: handleSaveNote(true),
        },
        {
            label: 'Not Publishable',
            handler: handleSaveNote(false),
        },
        {
            label: 'Fleeting Note',
            handler: handleSaveFleetingNote,
        },
    ];

    useNavbarContents(
        [
            <NavbarDropdown
                key='save-btn'
                icon={<FloppyDisk />}
                contents={dropdownButtons}
                text='Save As...'
                data-testid='save-btn'
            />,
        ],
        [auth],
    );

    return (
        <div
            className={`w-full h-full rounded-md flex p-1.5 gap-1.5 ${flexDirection === 'flex-col' ? 'flex-col' : 'flex-row'} overflow-y-hidden`}
            ref={textEditorRef}
        >
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div
                className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md`}
            >
                <Editor
                    markdownContent={markdownContent}
                    setMarkdownContent={setMarkdownContentCallback}
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
    );
}
