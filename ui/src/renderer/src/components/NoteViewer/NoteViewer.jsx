import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation, useParams } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi.js';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import {
    deleteFleetingNote,
    getFleetingNoteById,
    saveFleetingNoteAsFinal,
    updateFleetingNote
} from '../../services/fleetingNotesService/fleetingNotesService';
import {
    deleteNote,
    getNote,
    updateNote,
} from '../../services/notesService/notesService';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import extractHeaderHierarchy from '../../utils/editorUtils/markdownOutliner';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import ActivityList from '../ActivityList/ActivityList';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import FileInput from '../FileInput/FileInput';
import GraphExplorer from '../GraphExplorer/GraphExplorer.jsx';
import NoteGraphSearch from '../GraphQuery/NoteGraphSearch.jsx';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import ReportGenerationModal from '../Modals/ReportGenerationModal';
import NoteOutline from '../NoteOutline/NoteOutline';
import ReferenceTree from '../ReferenceTree/ReferenceTree';
import RichEditor from '../RichEditor/RichEditor';
import ActionsDropdown from './ActionsDropdown';
import { ViewMode } from './constants';
import FilesView from './FilesView';
import NoteMetadata from './NoteMetadata';
import StatusIndicators from './StatusIndicators';
import ViewsDropdown from './ViewsDropdown';

import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import '../../utils/customParser/prism-config.js';

/**
 * NoteViewer component - displays note content with editing capabilities
 */
export default function NoteViewer() {
    const { id } = useParams();
    const { navigate, navigateLink } = useCradleNavigate();
    const location = useLocation();
    const { isAdmin, profile } = useProfile();
    const { from, state } = location.state || { from: { pathname: '/' } };
    const [note, setNote] = useState({});
    const [richEditor, setRichEditor] = useState(
        localStorage.getItem('richEditor') ? localStorage.getItem('richEditor') === 'true' : true
    );
    const [markdownContent, setMarkdownContent] = useState('');
    const { setModal } = useModal();
    const [fileData, setFileData] = useState([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [parsedContent, setParsedContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState(ViewMode.CONTENT);
    const [showViewsMenu, setShowViewsMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isFleeting, setIsFleeting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showOutline, setShowOutline] = useState(() => {
        const saved = localStorage.getItem('showOutline');
        return saved === 'true' ? true : false;
    });
    const [noteOutline, setNoteOutline] = useState([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const rawContentRef = useRef(null);
    const editorRef = useRef(null);
    const { managementApi } = useApi();
    const { updateCurrentTabTitle } = usePaneTabs();
    const { activePaneId } = useLayout();

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor({}, setLspLoaded, displayError(setAlert));
    }, [setAlert]);

    const copyToClipboard = (text) => {
        navigator.clipboard
            .writeText(text)
            .catch((error) => {
                console.error('Failed to copy text: ', error);
            })
            .then(() => {
                setAlert({
                    show: true,
                    message: 'Copied to clipboard',
                    color: 'green',
                });
            });
    };

    const toggleOutline = useCallback(() => {
        const newValue = !showOutline;
        setShowOutline(newValue);
        localStorage.setItem('showOutline', newValue);
    }, [showOutline]);

    const smartLink = useCallback(
        async (onlyTimestamps) => {
            if (!editorRef.current) {
                return;
            }

            const view = editorRef.current.view || editorRef.current;
            if (!view || !view.state) {
                return;
            }

            const doc = view.state;
            let to = doc.selection.main.to;
            let from = doc.selection.main.from;
            let content = doc.doc.toString();

            if (to === from) {
                from = 0;
                to = content.length;
            }

            const [changes, linked] = await editorUtils.autoFormatLinks(
                view,
                from,
                to,
                onlyTimestamps,
            );

            view.dispatch({
                changes: { from: 0, to: content.length, insert: linked },
            });

            setMarkdownContent(linked);
            setAlert({
                show: true,
                message: `${changes > 0 ? changes : 'No'} link${changes == 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`,
                color: changes > 0 ? 'green' : 'gray',
            });
        },
        [editorUtils, setMarkdownContent, setAlert],
    );

    useEffect(() => {
        setIsLoading(true);

        // Try to load as regular note first, then fallback to fleeting note if it fails
        const loadNote = async () => {
            try {
                // First try to load as a regular note
                const response = await getNote(id, false);
                const responseNote = response.data;

                // Check if this is a fleeting note using the fleeting field
                const isFleetingNote = responseNote.fleeting === true;
                setIsFleeting(isFleetingNote);

                // Debug logging
                console.log('NoteViewer - Note type detection:', {
                    id: id,
                    isFleetingNote: isFleetingNote,
                    fleeting: responseNote.fleeting,
                    hasAuthor: !!responseNote.author,
                    hasEditor: !!responseNote.editor,
                    hasEntries: !!responseNote.entries
                });

                return response;
            } catch (error) {
                // If regular note fails, try as fleeting note
                console.log('NoteViewer - Regular note failed, trying fleeting note:', error);
                const response = await getFleetingNoteById(id);
                setIsFleeting(true);
                return response;
            }
        };

        loadNote()
            .then((response) => {
                const responseNote = response.data;
                setNote(responseNote);
                setMarkdownContent(responseNote.content);
                setInitialMarkdown(responseNote.content);
                setFileData(responseNote.files || []);
                setHasUnsavedChanges(false);
                // Update tab title with note title
                if (responseNote.title && activePaneId) {
                    updateCurrentTabTitle(activePaneId, responseNote.title);
                }
                return responseNote;
            })
            .then((note) => {
                return parseContent(note.content, note.files, true).then((result) =>
                    setParsedContent(result.html),
                );
            })
            .catch(displayError(setAlert, navigate))
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [id, navigate, setAlert, updateCurrentTabTitle, activePaneId, profile]);

    const toggleView = useCallback(() => {
        setRichEditor((prevRichEditor) => !prevRichEditor);
    }, []);

    const handleDelete = useCallback(() => {
        // Use the appropriate delete function based on whether the note is fleeting
        const deleteFunction = note.fleeting ? deleteFleetingNote : deleteNote;
        deleteFunction(id)
            .then(() => {
                if (!state) {
                    navigate(from, { replace: true });
                    return;
                }
                if (!state.notes) {
                    navigate(from, { replace: true, state: state });
                    return;
                }
                const stateNotes = state.notes.filter((note) => note.id !== id);
                const newState = { ...state, notes: stateNotes };
                navigate(from, { replace: true, state: newState });
            })
            .catch(displayError(setAlert, navigate));
    }, [id, navigate, note.fleeting]);

    // Use a ref to store the latest values for the save function
    const saveDataRef = useRef({ markdownContent, fileData, isFleeting });

    useEffect(() => {
        saveDataRef.current = { markdownContent, fileData, isFleeting };
    }, [markdownContent, fileData, isFleeting]);

    const handleSaveNote = useCallback(async () => {
        const { markdownContent: content, fileData: files, isFleeting: fleeting } = saveDataRef.current;

        if (!content || content.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            let response;
            if (fleeting) {
                // Update existing fleeting note
                response = await updateFleetingNote(id, content, files);
            } else {
                // Update regular note
                response = await updateNote(id, {
                    content: content,
                    files: files,
                });
            }

            if (response.status === 200) {
                setInitialMarkdown(content);
                setHasUnsavedChanges(false);
                setAlert({
                    show: false,
                });
                // Update the parsed content for preview
                parseContent(content, files, true).then((result) =>
                    setParsedContent(result.html),
                );
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, navigate, setAlert]);

    const handleSaveAsFinal = useCallback(async () => {
        if (!markdownContent || markdownContent.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            const response = await saveFleetingNoteAsFinal(id);

            if (response.status === 200) {
                setAlert({
                    show: true,
                    message: 'Note finalized successfully.',
                    color: 'green',
                });
                // Navigate to the regular note view
                navigate(`/notes/${response.data.id}`, { replace: true });
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, markdownContent, fileData, navigate]);

    const handleRelinkNote = useCallback(() => {
        managementApi.managementActionsCreate({
            actionName: 'relinkNotes',
            requestBody: {
                note_id: id,
            },
        }).then(() => {
            setAlert({
                show: true,
                message: 'Relinking note...',
                color: 'green',
            });
        });
    }, [id, managementApi, setAlert]);

    const handlePublish = useCallback(() => {
        setModal(ReportGenerationModal, {
            noteId: id,
            noteTitle: note.title,
            setAlert: setAlert,
        });
    }, [id, note.title, setAlert, setModal]);

    const handleDeleteWithConfirmation = useCallback(() => {
        setModal(ConfirmDeletionModal, {
            onConfirm: handleDelete,
            text: 'Are you sure you want to delete this note? This action is irreversible.',
        });
    }, [handleDelete, setModal]);

    const debouncedSaveNote = useMemo(
        () => debounce(handleSaveNote, 1500),
        [handleSaveNote]
    );

    // Auto-save for fleeting notes only
    useEffect(() => {
        if (!markdownContent || markdownContent === initialMarkdown) {
            // Clear any pending debounced calls if content matches initial
            debouncedSaveNote.cancel();
            return;
        }

        // Update unsaved status after a short delay
        setHasUnsavedChanges(true);
        // Trigger save after a longer delay
        debouncedSaveNote();

        // Cleanup function to cancel pending debounced calls
        return () => {
            debouncedSaveNote.cancel();
        };
    }, [markdownContent, initialMarkdown, debouncedSaveNote]);

    useEffect(() => {
        localStorage.setItem('richEditor', richEditor);
    }, [richEditor]);

    // Compute note outline from markdown content
    useEffect(() => {
        const content = markdownContent || '';
        setNoteOutline(extractHeaderHierarchy(content, (lineNumber) => {
            console.log(editorRef.current.view);
            const view = editorRef.current.view;
            if (view && typeof lineNumber === 'number') {
                const state = view.state;
                if (lineNumber == 1) {
                    view.dispatch({
                        selection: { anchor: 0, head: 0 },
                        scrollIntoView: true,
                    });
                } else {
                    const targetLinePos = state.doc.line(Math.max(1, lineNumber + 2)).from;
                    const selection = { anchor: targetLinePos, head: targetLinePos };

                    view.dispatch({
                        selection,
                        scrollIntoView: true,
                    });
                }
            }
        }));
    }, [markdownContent, editorRef]);

    // Conditionally render spinner or component
    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full w-full py-8'>
                <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900' />
            </div>
        );
    }

    return (
        <>
            <AlertDismissible
                alert={alert}
                setAlert={setAlert}
                onClose={() => setAlert('')}
            />
            <div className='w-[100%] h-full flex flex-col'>
                <div className='w-full cradle-border-b px-4 py-3 flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        {!id?.startsWith('guide_') && (
                            <StatusIndicators
                                markdownContent={markdownContent}
                                saving={saving}
                                hasUnsavedChanges={hasUnsavedChanges}
                                noteStatus={note.status}
                                noteStatusMessage={note.status_message}
                            />
                        )}
                        <NoteMetadata note={note} isFleeting={isFleeting} />
                    </div>

                    <div className='flex items-center gap-2'>
                        {!id?.startsWith('guide_') && (
                            <>
                                <ViewsDropdown
                                    activeView={activeView}
                                    richEditor={richEditor}
                                    showViewsMenu={showViewsMenu}
                                    setShowViewsMenu={setShowViewsMenu}
                                    setActiveView={setActiveView}
                                    setRichEditor={setRichEditor}
                                    isAdmin={isAdmin()}
                                    hasFiles={note.files && note.files.length > 0}
                                />
                                <ActionsDropdown
                                    activeView={activeView}
                                    showActionsMenu={showActionsMenu}
                                    setShowActionsMenu={setShowActionsMenu}
                                    showOutline={showOutline}
                                    toggleOutline={toggleOutline}
                                    lspLoaded={lspLoaded}
                                    smartLink={smartLink}
                                    isAdmin={isAdmin()}
                                    handleRelinkNote={handleRelinkNote}
                                    setShowFileUpload={setShowFileUpload}
                                    showFileUpload={showFileUpload}
                                    isFleeting={isFleeting}
                                    handleSaveAsFinal={handleSaveAsFinal}
                                    saving={saving}
                                    handlePublish={handlePublish}
                                    handleDelete={handleDeleteWithConfirmation}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* File Upload Section */}
                {showFileUpload && (
                    <div className='w-full px-4 py-2 cradle-border-b bg-gray-50 dark:bg-gray-800'>
                        <FileInput
                            fileData={fileData}
                            setFileData={setFileData}
                            pendingFiles={pendingFiles}
                            setPendingFiles={setPendingFiles}
                        />
                    </div>
                )}

                {/* View content */}
                <div className='flex-1'>
                    {/* Content View */}
                    {activeView === ViewMode.CONTENT && (
                        <div className='w-full h-full overflow-hidden flex flex-col'>
                            <div className='h-full w-full pb-4 overflow-y-hidden'>
                                {showOutline ? (
                                    <PanelGroup direction='horizontal' className='h-full'>
                                        {/* Outline sidebar - rendered once */}
                                        <Panel defaultSize={15} minSize={10} maxSize={30}>
                                            <div className='h-full pr-2 overflow-y-auto'>
                                                <NoteOutline
                                                    data={noteOutline}
                                                    title='Note Outline'
                                                    showSeparators={true}
                                                />
                                            </div>
                                        </Panel>
                                        <PanelResizeHandle className='w-[2px] cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                                        {/* Editor Panel - conditionally renders Rich or Normal editor */}
                                        <Panel defaultSize={85} minSize={50}>
                                            <div className='h-full flex flex-col border-l cradle-border'>
                                                {/* Embedded Rich Editor */}
                                                <div className='flex-1 min-h-0'>
                                                    <RichEditor
                                                        key={richEditor ? 'rich' : 'source'}
                                                        ref={editorRef}
                                                        noteid={id}
                                                        markdownContent={markdownContent}
                                                        setMarkdownContent={setMarkdownContent}
                                                        fileData={fileData}
                                                        setFileData={setFileData}
                                                        source={!richEditor}
                                                        setAlert={setAlert}
                                                        saveNote={handleSaveNote}
                                                    />
                                                </div>

                                                {/* Reference Tree below the editor */}
                                                <div className='mt-4'>
                                                    <ReferenceTree
                                                        note={note}
                                                        setAlert={setAlert}
                                                    />
                                                </div>
                                            </div>
                                        </Panel>
                                    </PanelGroup>
                                ) : (
                                    <div className='h-full'>
                                        <div className='h-full flex flex-col border-l cradle-border'>
                                            <div className='flex-1 min-h-0'>
                                                <RichEditor
                                                    key={richEditor ? 'rich' : 'source'}
                                                    ref={editorRef}
                                                    noteid={id}
                                                    markdownContent={markdownContent}
                                                    setMarkdownContent={setMarkdownContent}
                                                    fileData={fileData}
                                                    setFileData={setFileData}
                                                    source={!richEditor}
                                                    setAlert={setAlert}
                                                    saveNote={handleSaveNote}
                                                />
                                            </div>

                                            {/* Reference Tree below the editor */}
                                            <div className='mt-4'>
                                                <ReferenceTree
                                                    note={note}
                                                    setAlert={setAlert}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Graph View */}
                    {activeView === ViewMode.GRAPH && (
                        <GraphExplorer GraphSearchComponent={NoteGraphSearch(note.id)} />
                    )}

                    {activeView === ViewMode.FILES && (
                        <FilesView
                            files={note.files}
                            setAlert={setAlert}
                            copyToClipboard={copyToClipboard}
                        />
                    )}

                    {isAdmin() && activeView === ViewMode.HISTORY && (
                        <div className='pt-2'>
                            <ActivityList content_type='note' objectId={id} />
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}
