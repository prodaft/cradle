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
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import extractHeaderHierarchy from '../../utils/editorUtils/markdownOutliner';
import { displayError } from '../../utils/responseUtils/responseUtils';
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

import { EditPencil, Eye } from 'iconoir-react';
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
    const [enableEditing, setEnableEditing] = useState(
        localStorage.getItem('enableEditing') ? localStorage.getItem('enableEditing') === 'true' : true
    );
    const [markdownContent, setMarkdownContent] = useState('');
    const { setModal } = useModal();
    const [fileData, setFileData] = useState([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
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
        return saved === 'true';
    });
    const [noteOutline, setNoteOutline] = useState([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const rawContentRef = useRef(null);
    const editorRef = useRef(null);
    const { managementApi, fleetingNotesApi, notesApi, lspApi } = useApi();
    const { updateCurrentTabTitle } = usePaneTabs();
    const { activePaneId } = useLayout();

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor({}, setLspLoaded, displayError(setAlert), notesApi, lspApi);
    }, [setAlert, notesApi, lspApi]);

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

    const toggleEditing = useCallback(() => {
        const newValue = !enableEditing;
        setEnableEditing(newValue);
        localStorage.setItem('enableEditing', newValue);
    }, [enableEditing]);

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
        // Guard: Don't attempt to load if id is not available
        if (!id) {
            console.warn('NoteViewer - No note ID provided');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Try to load as regular note first, then fallback to fleeting note if it fails
        const loadNote = async () => {
            console.log('NoteViewer - Loading note with ID:', id, 'Type:', typeof id);

            try {
                // First try to load as a regular note
                const responseNote = await notesApi.notesRetrieve({ noteId: id, footnotes: false });

                // Check if this is a fleeting note using the fleeting field
                const isFleetingNote = responseNote.fleeting === true;
                setIsFleeting(isFleetingNote);

                // Debug logging
                console.log('NoteViewer - Note loaded successfully:', {
                    id: id,
                    isFleetingNote: isFleetingNote,
                    fleeting: responseNote.fleeting,
                    hasAuthor: !!responseNote.author,
                    hasEditor: !!responseNote.editor,
                    hasEntries: !!responseNote.entries
                });

                return responseNote;
            } catch (error) {
                // If regular note fails, try as fleeting note
                console.error('NoteViewer - Regular note failed, trying fleeting note. Error:', error);
                console.log('NoteViewer - Attempting fleeting note with ID:', id);
                const responseNote = await fleetingNotesApi.fleetingNotesRetrieve({ id });
                setIsFleeting(true);
                console.log('NoteViewer - Fleeting note loaded successfully');
                return responseNote;
            }
        };

        loadNote()
            .then((responseNote) => {
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
            .catch(displayError(setAlert, navigate))
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [id, navigate, setAlert, updateCurrentTabTitle, activePaneId, profile, notesApi, fleetingNotesApi]);

    const toggleView = useCallback(() => {
        setRichEditor((prevRichEditor) => !prevRichEditor);
    }, []);

    const handleDelete = useCallback(async () => {
        try {
            // Use the appropriate delete function based on whether the note is fleeting
            if (note.fleeting) {
                await fleetingNotesApi.fleetingNotesDestroy({ id });
            } else {
                await notesApi.notesDelete({ noteId: id });
            }

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
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    }, [id, navigate, note.fleeting, fleetingNotesApi, notesApi, state, from, setAlert]);

    // Use a ref to store the latest values for the save function
    const saveDataRef = useRef({ markdownContent, fileData, isFleeting });

    useEffect(() => {
        saveDataRef.current = { markdownContent, fileData, isFleeting };
    }, [markdownContent, fileData, isFleeting]);

    const handleSaveNote = useCallback(async (showAlert = false) => {
        const { markdownContent: content, fileData: files, isFleeting: fleeting } = saveDataRef.current;

        if (!content || content.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            if (fleeting) {
                // Update existing fleeting note
                await fleetingNotesApi.fleetingNotesUpdate({
                    id,
                    fleetingNoteRequest: {
                        content,
                        files,
                    },
                });
                setAlert({
                    show: showAlert,
                    message: 'Fleeting note saved.',
                    color: 'green',
                })
            } else {
                // Update regular note
                await notesApi.notesUpdate({
                    noteId: id,
                    noteEditRequest: {
                        content: content,
                        files: files,
                    },
                });
                setAlert({
                    show: showAlert,
                    message: 'Note saved successfully.',
                    color: 'green',
                })
            }

            setInitialMarkdown(content);
            setHasUnsavedChanges(false);
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, navigate, setAlert, fleetingNotesApi, notesApi]);

    const handleSaveAsFinal = useCallback(async () => {
        if (!markdownContent || markdownContent.trim().length === 0) {
            setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
            return;
        }

        setSaving(true);
        try {
            const response = await fleetingNotesApi.fleetingNotesFinalUpdate({ id });

            setAlert({
                show: true,
                message: 'Note finalized successfully.',
                color: 'green',
            });
            // Navigate to the regular note view
            navigate(`/notes/${response.id}`, { replace: true });
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setSaving(false);
        }
    }, [id, markdownContent, fileData, navigate, fleetingNotesApi, setAlert]);

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
            if (!editorRef.current?.view || typeof lineNumber !== 'number') return;

            const view = editorRef.current.view;
            if (view) {
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
                                isFleeting={note.fleeting}
                                noteStatus={note.status}
                                noteStatusMessage={note.status_message}
                            />
                        )}
                        <NoteMetadata note={note} isFleeting={isFleeting} />
                    </div>

                    <div className='flex items-center gap-2'>
                        {!id?.startsWith('guide_') && (
                            <>

                                {activeView === ViewMode.CONTENT && (
                                    <button
                                        onClick={() => {
                                            toggleEditing();
                                        }}
                                        className='w-full text-left px-2 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                        data-testid='toggle-editing-mode-menu-item'
                                    >
                                        {enableEditing ? <EditPencil width='16' height='16' /> : <Eye width='16' height='16' />}
                                        {/* <span className='flex-1'>{enableEditing ? 'Mode' : 'Preview Mode'}</span> */}
                                    </button>
                                )}
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
                                    enableEditing={enableEditing}
                                    setEnableEditing={setEnableEditing}
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
                                                        enableEditing={enableEditing}
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
                                                enableEditing={enableEditing}
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
