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
import {
    addFleetingNote,
    deleteFleetingNote,
    getFleetingNoteById,
    saveFleetingNoteAsFinal,
    updateFleetingNote,
} from '../../services/fleetingNotesService/fleetingNotesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
// import { parseContent } from '../../utils/textEditorUtils/textEditorUtils'; // <-- Remove old parser import
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';

// === New imports for worker-based parsing ===
import DOMPurify from 'dompurify';
import { parseWorker } from '../../utils/customParser/customParser'; // The same approach as in NoteEditor

export default function TextEditor({ autoSaveDelay = 1000 }) {
    const [markdownContent, setMarkdownContent] = useState('');
    const markdownContentRef = useRef(markdownContent);
    const textEditorRef = useRef(null);
    const resizeRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [splitPosition, setSplitPosition] = useState(
        Number(localStorage.getItem('editor.splitPosition')) || 50
    );
    const [lastPosition, setLastPosition] = useState(splitPosition);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
        localStorage.getItem('preview.collapse') === 'true'
    );
    const prevIdRef = useRef(null);

    // === Worker-related states/refs ===
    const [worker, setWorker] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const pendingParseRef = useRef(false);

    const NEW_NOTE_PLACEHOLDER_ID = 'new';

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        // Create worker instance (same approach as in NoteEditor)
        const workerInstance = parseWorker();

        // Handle worker messages
        workerInstance.onmessage = (event) => {
            if (event.data.html) {
                // Sanitize the result
                setParsedContent(DOMPurify.sanitize(event.data.html));
            }

            // If there's a pending parse request (we changed content while parsing)
            if (pendingParseRef.current) {
                pendingParseRef.current = false;
                workerInstance.postMessage({
                    markdown: markdownContentRef.current,
                    fileData: fileDataRef.current
                });
            } else {
                setIsParsing(false);
            }
        };

        setWorker(workerInstance);

        // We only parse immediately if the preview is not collapsed and the content isn't empty
        if (!previewCollapsed && markdownContent.trim() !== '') {
            setIsParsing(true);
            workerInstance.postMessage({
                markdown: markdownContent,
                fileData
            });
        }

        // Cleanup on unmount
        return () => {
            workerInstance.terminate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!worker) return;

        // If preview is collapsed, we don't parse anything
        if (previewCollapsed) {
            setParsedContent('');
            return;
        }

        if (!isParsing) {
            // If no parse in progress, start it immediately
            setIsParsing(true);
            worker.postMessage({
                markdown: markdownContent,
                fileData
            });
        } else {
            // If a parse is in progress, flag it for a rerun after current parse
            pendingParseRef.current = true;
        }
    }, [markdownContent, fileData, previewCollapsed, worker, isParsing]);

    useEffect(() => {
        if (id) {
            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                setMarkdownContent('');
                setFileData([]);
                setHasUnsavedChanges(true);
                prevIdRef.current = NEW_NOTE_PLACEHOLDER_ID;
            } else {
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

    // Keep refs in sync
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    const isValidContent = () =>
        markdownContentRef.current && markdownContentRef.current.trim();

    const validateContent = () => {
        if (isValidContent()) {
            return true;
        } else {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return false;
        }
    };

    const handleSaveNote = (displayAlert) => {
        if (!validateContent()) return;
        if (id) {
            const storedContent = markdownContentRef.current;
            const storedFileData = fileDataRef.current;

            if (id === NEW_NOTE_PLACEHOLDER_ID) {
                addFleetingNote(storedContent, storedFileData)
                    .then((res) => {
                        if (res.status === 200) {
                            refreshFleetingNotes();
                            setHasUnsavedChanges(false);
                            prevIdRef.current = res.data.id;
                            navigate(`/editor/${res.data.id}`);
                        }
                    })
                    .catch(displayError(setAlert, navigate));
            } else {
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
                        navigate('/editor/new');
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

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
                        navigate('/editor/new', { replace: true });
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    useEffect(() => {
        if (!isValidContent()) return;

        // If we changed the ID, skip the immediate autosave
        if (prevIdRef.current !== id) {
            prevIdRef.current = id;
            return;
        }

        setHasUnsavedChanges(true);
        const autosaveTimer = setTimeout(() => {
            handleSaveNote('');
        }, autoSaveDelay);

        return () => {
            clearTimeout(autosaveTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markdownContent, fileData]);

    useEffect(() => {
        return () => {
            prevIdRef.current = null;
        };
    }, []);

    const previewCollapseUpdated = (collapsed) => {
        setPreviewCollapsed(collapsed);
        localStorage.setItem('preview.collapse', collapsed);
    };

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
                icon={<FloppyDisk />}
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
            <div className="w-full h-full p-1.5 relative" ref={textEditorRef}>
                <div className='absolute bottom-4 right-8 px-2 py-1 rounded-md backdrop-blur-lg backdrop-filter bg-cradle3 bg-opacity-50 shadow-lg text-zinc-300'>
                    {isValidContent()
                        ? hasUnsavedChanges
                            ? 'Changes Not Saved'
                            : 'Saved'
                        : 'Cannot Save Empty Note'}
                </div>
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
                            setViewCollapsed={previewCollapseUpdated}
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

                                {/* Optional loading overlay if desired */}
                                {isParsing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                                        <div className="animate-spin rounded-full border-8 border-t-8 border-gray-400 h-16 w-16" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
