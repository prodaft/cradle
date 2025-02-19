import React, { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { FloppyDisk } from 'iconoir-react/regular';
import DOMPurify from 'dompurify';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Editor from '../Editor/Editor';
import Preview from '../Preview/Preview';
import { updateNote, getNote } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import TextEditor from '../TextEditor/TextEditor';
import { diff_match_patch } from 'diff-match-patch';

export default function NoteEditor() {
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const initialMarkdownRef = useRef(initialMarkdown);
    const [markdownContent, setMarkdownContent] = useState('');
    const [fileData, setFileData] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // New state for loading animation
    const markdownContentRef = useRef(markdownContent);
    const fileDataRef = useRef(fileData);
    const textEditorRef = useRef(null);
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
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
                patch: dmp.patch_toText(patch),
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

    useNavbarContents(
        [
            <NavbarButton
                key='editor-save-btn'
                icon={<FloppyDisk />}
                text='Save'
                onClick={() => handleSaveNote('Changes saved successfully.')}
                awaitOnClick={true}
            />,
        ],
        [auth, id],
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
                    setFileData={setFileData}
                />
            )}
        </div>
    );
}
