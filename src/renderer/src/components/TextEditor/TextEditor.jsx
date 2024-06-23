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
import useChangeFlexDirectionBySize from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
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
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const auth = useAuth();
    const navigate = useNavigate();
    const isLightMode = useLightMode();
    const [markdownContent, setMarkdownContentCallback] = useLocalStorage(
        'md-content',
        '',
    );
    const [fileData, setFileData] = useLocalStorage('file-data', []);
    const markdownContentRef = useRef(markdownContent);
    const textEditorRef = useRef(null);
    const fileDataRef = useRef(fileData);
    const { refreshFleetingNotes } = useOutletContext();
    const [parsedContent, setParsedContent] = useState('');

    useEffect(() => {
        parseContent(markdownContent, fileData)
            .then((parsedContent) => setParsedContent(parsedContent))
            .catch(displayError(setAlert));
    }, [markdownContent, fileData]);

    // Resize the text editor based on the size of the parent container
    const flexDirection = useChangeFlexDirectionBySize(textEditorRef);

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    const isEmptyNote = () => {
        if (!markdownContentRef.current) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return true;
        }
        return false;
    };

    // Open the dialog to save the note. If the note is empty, display an error.
    // Attempt to send the note to the server. If successful, clear the local storage. Otherwise, display the error.
    const handleSaveNote = (publishable) => () => {
        if (isEmptyNote()) return;

        const storedContent = markdownContentRef.current;
        const storedFileData = fileDataRef.current;

        saveNote(storedContent, publishable, storedFileData)
            .then((res) => {
                if (res.status === 200) {
                    // Clear local storage on success
                    setMarkdownContentCallback('');
                    setFileData([]);
                    localStorage.removeItem('minio-cache');
                    setAlert({
                        show: true,
                        message: 'Note saved successfully.',
                        color: 'green',
                    });
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    const handleSaveFleetingNote = () => {
        if (isEmptyNote()) return;

        const storedContent = markdownContentRef.current;
        const storedFileData = fileDataRef.current;

        addFleetingNote(storedContent, storedFileData)
            .then((res) => {
                if (res.status === 200) {
                    // Clear local storage on success
                    refreshFleetingNotes();
                    setMarkdownContentCallback('');
                    setFileData([]);
                    localStorage.removeItem('minio-cache');
                    setAlert({
                        show: true,
                        message: 'Fleeting note saved successfully.',
                        color: 'green',
                    });
                    navigate(`/fleeting-editor/${res.data.id}`);
                }
            })
            .catch(displayError(setAlert, navigate));
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
            <AlertDismissible alert={alert} setAlert={setAlert} />
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
