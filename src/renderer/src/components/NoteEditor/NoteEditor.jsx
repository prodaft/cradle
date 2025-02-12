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
import { parseWorker } from '../../utils/customParser/customParser';
import TextEditor from '../TextEditor/TextEditor';
import { markdown } from '@codemirror/lang-markdown';

export default function NoteEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const [fileData, setFileData] = useState([]);
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

    useEffect(() => {
        getNote(id, false)
            .then((response) => {
                setMarkdownContent(response.data.content);
                setFileData(response.data.files);
            })
            .catch(displayError(setAlert, navigate));
    }, [id]);

    const isValidContent = () => markdownContentRef.current && markdownContentRef.current.trim().length > 0

    const validateContent = () => {
        if (isValidContent()) {
            return true;
        } else {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
    }

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


    useNavbarContents(
        [
            <NavbarButton
                key='editor-save-btn'
                icon={<FloppyDisk />}
                text='Save'
                onClick={() => handleSaveNote('Changes saved successfully.')}
            />,
        ],
        [auth, id],
    );

    return (
        <div className='w-full h-full p-1.5 relative' ref={textEditorRef}>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <TextEditor
                markdownContent={markdownContent}
                setMarkdownContent={setMarkdownContent}
      fileData={fileData}
      setFileData={setFileData}
            />
        </div>
    );
}
