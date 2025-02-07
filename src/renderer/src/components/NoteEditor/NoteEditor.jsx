import React, { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import useLightMode from '../../hooks/useLightMode/useLightMode';
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

export default function NoteEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const markdownContentRef = useRef(markdownContent);
    const textEditorRef = useRef(null);
    const resizeRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [splitPosition, setSplitPosition] = useState(
        Number(localStorage.getItem('editor.splitPosition')) || 50
    );
    const [lastPosition, setLastPosition] = useState(splitPosition);
    const [isParsing, setIsParsing] = useState(false);
    const pendingParseRef = useRef(false);
    const auth = useAuth();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const isLightMode = useLightMode();
    const { id } = useParams();
    const [fileData, setFileData] = useState([]);
    const fileDataRef = useRef(fileData);
    const [parsedContent, setParsedContent] = useState('');
    const [previewCollapsed, setPreviewCollapsed] = useState(
        localStorage.getItem('preview.collapse') === 'true'
    );
    const [worker, setWorker] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const workerInstance = parseWorker();
        workerInstance.onmessage = (event) => {
            if (event.data.html) {
                setParsedContent(DOMPurify.sanitize(event.data.html));
            }
            if (pendingParseRef.current) {
                pendingParseRef.current = false;
                setIsParsing(true);
                workerInstance.postMessage({ markdown: markdownContent, fileData });
            } else {
                setIsParsing(false);
            }
        };
        setWorker(workerInstance);
        workerInstance.postMessage({ markdown: markdownContent, fileData });
        setIsParsing(true);

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (worker) {
            if (!isParsing) {
                setIsParsing(true);
                worker.postMessage({ markdown: markdownContent, fileData });
            } else {
                pendingParseRef.current = true;
            }
        }
    }, [markdownContent, fileData, worker, isParsing]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            e.preventDefault();
            
            const container = textEditorRef.current;
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            let newPosition = isMobile
                ? ((e.clientY - containerRect.top) / containerRect.height) * 100
                : ((e.clientX - containerRect.left) / containerRect.width) * 100;

            newPosition = Math.min(Math.max(newPosition, 20), 80);
            requestAnimationFrame(() => {
                setSplitPosition(newPosition);
                localStorage.setItem('editor.splitPosition', newPosition);
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.classList.remove('select-none');
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('select-none');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isMobile]);

    useEffect(() => {
        getNote(id, false)
            .then((response) => {
                setMarkdownContent(response.data.content);
                setFileData(response.data.files);
            })
            .catch(displayError(setAlert, navigate));
    }, [id]);

    const handleSaveNote = (displayAlert) => {
        if (!markdownContent?.trim()) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        updateNote(id, { content: markdownContentRef.current, files: fileDataRef.current })
            .then((response) => {
                if (response.status === 200) {
                    if (displayAlert) {
                        setAlert({ show: true, message: displayAlert, color: 'green' });
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
        [auth, id]
    );

    return (
        <div className="w-full h-full p-1.5 relative" ref={textEditorRef}>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className="w-full h-full flex md:flex-row flex-col relative">
                <div 
                    className="bg-gray-2 rounded-md overflow-hidden transition-[width,height] duration-200 ease-out"
                    style={{
                        width: !isMobile ? `${splitPosition}%` : '100%',
                        height: isMobile ? `${splitPosition}%` : '100%'
                    }}
                >
                    <Editor
                        markdownContent={markdownContent}
                        setMarkdownContent={setMarkdownContent}
                        isLightMode={isLightMode}
                        fileData={fileData}
                        setFileData={setFileData}
                        viewCollapsed={previewCollapsed}
                        setViewCollapsed={setPreviewCollapsed}
                    />
                </div>
                {!previewCollapsed && (
                    <>
                        <div
                            ref={resizeRef}
                            className={`
                                ${isMobile ? 'h-1.5 w-full' : 'w-1.5 h-full'}
                                bg-gray-3 hover:bg-gray-4 active:bg-gray-5
                                transition-colors duration-200
                                ${isResizing ? 'bg-gray-5' : ''}
                                ${isMobile ? 'cursor-row-resize' : 'cursor-col-resize'}
                                relative group
                            `}
                            onMouseDown={() => setIsResizing(true)}
                            onDoubleClick={() => {
                                if (splitPosition !== 50) {
                                    setLastPosition(splitPosition);
                                    setSplitPosition(50);
                                } else if (lastPosition !== 50) {
                                    setSplitPosition(lastPosition);
                                }
                                localStorage.setItem('editor.splitPosition', splitPosition);
                            }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className={`
                                    w-1 h-6 bg-gray-6 rounded-full opacity-0
                                    group-hover:opacity-100 transition-opacity duration-200
                                    ${isMobile ? 'rotate-90' : ''}
                                `}/>
                            </div>
                        </div>
                        <div
                            className="bg-gray-2 rounded-md overflow-hidden transition-[width,height] duration-200 ease-out relative"
                            style={{
                                width: !isMobile ? `${100 - splitPosition}%` : '100%',
                                height: isMobile ? `${100 - splitPosition}%` : '100%'
                            }}
                        >
                            <Preview htmlContent={parsedContent} />
                            {isParsing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                                    <div className="animate-spin rounded-full border-8 border-t-8 border-gray-200 h-16 w-16" />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
