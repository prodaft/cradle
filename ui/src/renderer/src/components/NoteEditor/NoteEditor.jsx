import { keymap } from '@codemirror/view';
import { diff_match_patch } from 'diff-match-patch';
import { Trash } from 'iconoir-react';
import { FloppyDisk } from 'iconoir-react/regular';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useParams } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import {
    deleteNote,
    getNote,
    updateNote,
} from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import NavbarButton from '../NavbarButton/NavbarButton';
import TextEditor from '../TextEditor/TextEditor';

export default function NoteEditor() {
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const initialMarkdownRef = useRef(initialMarkdown);
    const [markdownContent, setMarkdownContent] = useState('');
    const [fileData, setFileData] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // New state for loading animation
    const markdownContentRef = useRef(markdownContent);
    const fileDataRef = useRef(fileData);
    const textEditorRef = useRef(null);
    const [editorExtensions, setEditorExtensions] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { id } = useParams();

    // Ensure the ref to the markdown content is correct
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    // Ensure the ref to the file data is correct
    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    // Ensure the ref to the initial markdown is correct
    useEffect(() => {
        initialMarkdownRef.current = initialMarkdown;
    }, [initialMarkdown]);

    useEffect(() => {
        setIsLoading(true);
        getNote(id, false)
            .then((response) => {
                setMarkdownContent(response.data.content);
                setInitialMarkdown(response.data.content);
                setFileData(response.data.files);
                setIsLoading(false);
            })
            .catch(displayError(setAlert, navigate));
    }, [id]);

    const isValidContent = () =>
        markdownContentRef.current && markdownContentRef.current.trim().length > 0;

    const validateContent = () => {
        if (isValidContent()) {
            return true;
        } else {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
    };

    const handleSaveNote = async (displayAlert) => {
        if (!validateContent()) return;

        var dmp = new diff_match_patch();
        const storedContent = markdownContentRef.current;
        const storedFileData = fileDataRef.current;
        let patch = dmp.patch_make(initialMarkdownRef.current, storedContent);

        try {
            let response = await updateNote(id, {
                content: markdownContentRef.current,
                files: storedFileData,
            });
            if (response.status === 200) {
                setInitialMarkdown(storedContent);
                if (displayAlert) {
                    setAlert({
                        show: true,
                        message: displayAlert,
                        color: 'green',
                    });
                }
                // navigate(`/notes/${response.data.id}`);
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleDeleteNote = async () => {
        deleteNote(id)
            .then((response) => {
                if (response.status === 200) {
                    setAlert({
                        show: true,
                        color: 'green',
                        message: 'Note deleted successfully',
                    });
                    // Navigate after 2 seconds
                    setTimeout(() => {
                        navigate('/');
                    }, 2000);
                }
            })
            .catch(displayError(setAlert, navigate));
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

    useNavbarContents(
        [
            <NavbarButton
                key='editor-save-btn'
                icon={<FloppyDisk />}
                text='Save'
                onClick={() => handleSaveNote('Changes saved successfully.')}
                awaitOnClick={true}
            />,

            <NavbarButton
                key='delete-note-btn'
                icon={<Trash />}
                text='Delete'
                onClick={() =>
                    setModal(ConfirmDeletionModal, {
                        props: {
                            onConfirm: handleDeleteNote,
                            text: 'Are you sure you want to delete this note? This action is irreversible.',
                        },
                    })
                }
                awaitOnClick={true}
            />,
        ],
        [id],
    );

    return (
        <div className='w-full h-full p-1.5 relative' ref={textEditorRef}>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            {isLoading ? (
                <div className='flex items-center justify-center min-h-screen'>
                    <div className='spinner-dot-pulse spinner-xl'>
                        <div className='spinner-pulse-dot'></div>
                    </div>
                </div>
            ) : (
                <TextEditor
                    markdownContent={markdownContent}
                    setMarkdownContent={setMarkdownContent}
                    fileData={fileData}
                    saveNote={() => handleSaveNote('Changes saved successfully.')}
                    setFileData={setFileData}
                    editorExtensions={editorExtensions} // Pass the extensions to the TextEditor
                />
            )}
        </div>
    );
}
