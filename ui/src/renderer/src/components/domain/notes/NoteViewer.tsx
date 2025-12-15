import { usePaneTabs } from '@/contexts/tabs/PaneTabsContext';
import { useLayout } from '@/contexts/ui/LayoutContext';
import { useModal } from '@/contexts/ui/ModalContext';
import { useNotif } from '@/contexts/ui/NotificationContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { useTabContext } from '@/hooks/tabs/useTabContext';
import { CradleEditor } from '@/utils/editor/enhancements';
import extractHeaderHierarchy, { HeaderNode } from '@/utils/editor/outline';
import type { FileReferenceWithNote, NoteRetrieve } from '@services/cradle/models';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation } from 'react-router-dom';
import FileInput from '../../forms/FileInput';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import ReportGenerationModal from '../../modals/reports/ReportGenerationModal';
import ActivityList from '../activity/ActivityList';
import GraphExplorer from '../graph/GraphExplorer';
import NoteGraphSearch from '../graph/NoteGraphSearch';
import ReferenceTree from '../relations/ReferenceTree';
import ActionsDropdown from './ActionsDropdown';
import { ViewMode } from './constants';
import FilesView from './FilesView';
import NoteMetadata from './NoteMetadata';
import NoteOutline from './NoteOutline';
import RichEditor from './RichEditor';
import StatusIndicators from './StatusIndicators';
import ViewsDropdown from './ViewsDropdown';

import Tooltip from '@/components/base/Tooltip/Tooltip';
import FileUploadModal from '@/components/modals/notes/FileUploadModal';
import { openSearchPanel } from '@codemirror/search';
import { EditPencil, Eye } from 'iconoir-react';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

interface LocationState {
    from?: { pathname: string };
    state?: {
        notes?: NoteRetrieve[];
        [key: string]: unknown;
    };
}

/**
 * NoteViewer component - displays note content with editing capabilities
 */
export default function NoteViewer() {
    const { params } = useTabContext();
    const id = params.id || '';
    const { navigate } = useCradleNavigate();
    const location = useLocation();
    const locationState = (location.state as LocationState) || {};
    const { isAdmin, profile } = useProfile();
    const { from, state } = locationState;
    const [note, setNote] = useState<NoteRetrieve | null>(null);
    const [richEditor, setRichEditor] = useState(
        localStorage.getItem('richEditor')
            ? localStorage.getItem('richEditor') === 'true'
            : true,
    );
    const [enableEditing, setEnableEditing] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');
    const { setModal } = useModal();
    const { notify } = useNotif();
    const [fileData, setFileData] = useState<FileReferenceWithNote[]>([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ViewMode>(ViewMode.CONTENT);
    const [showViewsMenu, setShowViewsMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isFleeting, setIsFleeting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showOutline, setShowOutline] = useState(() => {
        const saved = localStorage.getItem('showOutline');
        return saved === 'true';
    });
    const [noteOutline, setNoteOutline] = useState<HeaderNode[]>([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const rawContentRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<any>(null);
    const { managementApi, fleetingNotesApi, notesApi, lspApi } = useApi();
    const { updateCurrentTabTitle } = usePaneTabs();
    const { activePaneId } = useLayout();
    const { execute, handleError } = useAPICall();

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(lspApi, notesApi, {}, setLspLoaded, (error) =>
            handleError(error, { suppressNotification: false }),
        );
    }, [notify, notesApi, lspApi]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                notify({
                    type: 'success',
                    text: 'Copied to clipboard',
                });
            })
            .catch((error) => {
                console.error('Failed to copy text: ', error);
                notify({
                    type: 'error',
                    text: 'Failed to copy to clipboard',
                });
            });
    };

    const toggleOutline = useCallback(() => {
        const newValue = !showOutline;
        setShowOutline(newValue);
        localStorage.setItem('showOutline', newValue.toString());
    }, [showOutline]);

    const toggleEditing = useCallback(() => {
        const newValue = !enableEditing;
        setEnableEditing(newValue);
        localStorage.setItem('enableEditing', newValue.toString());
    }, [enableEditing]);

    const smartLink = useCallback(
        async (onlyTimestamps: boolean) => {
            if (!editorRef.current) {
                return;
            }

            const view = editorRef.current.view || editorRef.current;
            if (!view || !view.state) {
                return;
            }

            console.log(view)

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
            notify({
                type: changes > 0 ? 'success' : 'info',
                text: `${changes > 0 ? changes : 'No'} link${changes == 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`,
            });
        },
        [editorUtils, setMarkdownContent, notify],
    );

    useEffect(() => {
        if (!id) {
            console.warn('NoteViewer - No note ID provided');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Try to load as regular note first, then fallback to fleeting note if it fails
        const loadNote = async () => {
            try {
                // First try to load as a regular note
                const responseNote = await execute(() =>
                    notesApi.notesRetrieve({ noteId: id, footnotes: false }),
                );

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
                    hasEntries: !!responseNote.entries,
                });

                return responseNote;
            } catch (error) {
                // If regular note fails, try as fleeting note
                console.error(
                    'NoteViewer - Regular note failed, trying fleeting note. Error:',
                    error,
                );
                console.log('NoteViewer - Attempting fleeting note with ID:', id);
                const responseNote = await execute(
                    () => fleetingNotesApi.fleetingNotesRetrieve({ id }),
                    { errorMessage: 'Note not found!' },
                );
                setIsFleeting(true);
                console.log('NoteViewer - Fleeting note loaded successfully');
                return responseNote as NoteRetrieve;
            }
        };

        execute(() => loadNote())
            .then((responseNote) => {
                console.log('NoteViewer - Note loaded successfully:', responseNote);
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
            .catch(() => { })
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [
        id,
        navigate,
        execute,
        updateCurrentTabTitle,
        activePaneId,
        profile,
        notesApi,
        fleetingNotesApi,
    ]);

    const handleDelete = useCallback(async () => {
        if (!note || !id) return;

        execute(async () => {
            // Use the appropriate delete function based on whether the note is fleeting
            if (note.fleeting) {
                await fleetingNotesApi.fleetingNotesDestroy({ id });
            } else {
                await notesApi.notesDelete({ noteId: id });
            }

            if (!state) {
                navigate(from?.pathname || '/', { replace: true });
                return;
            }
            if (!state.notes) {
                navigate(from?.pathname || '/', { replace: true, state: state });
                return;
            }
            const stateNotes = state.notes.filter((n) => n.id !== id);
            const newState = { ...state, notes: stateNotes };
            navigate(from?.pathname || '/', { replace: true, state: newState });
        }).catch(() => { });
    }, [id, execute, navigate, note, fleetingNotesApi, notesApi, state, from]);

    // Use a ref to store the latest values for the save function
    const saveDataRef = useRef({ markdownContent, fileData, isFleeting });

    useEffect(() => {
        saveDataRef.current = { markdownContent, fileData, isFleeting };
    }, [markdownContent, fileData, isFleeting]);

    const handleSaveNote = useCallback(
        async (showAlert = false) => {
            if (!id) return;

            const {
                markdownContent: content,
                fileData: files,
                isFleeting: fleeting,
            } = saveDataRef.current;

            if (!content || content.trim().length === 0) {
                notify({ type: 'error', text: 'Cannot save empty note.' });
                return;
            }

            setSaving(true);
            const successMessage = fleeting
                ? showAlert
                    ? 'Fleeting note saved.'
                    : undefined
                : showAlert
                    ? 'Note saved successfully.'
                    : undefined;

            execute(
                async () => {
                    if (fleeting) {
                        // Update existing fleeting note
                        await fleetingNotesApi.fleetingNotesUpdate({
                            id,
                            fleetingNoteRequest: {
                                content,
                                files,
                            },
                        });
                    } else {
                        // Update regular note
                        await notesApi.notesUpdate({
                            noteId: id,
                            noteEditRequest: {
                                content: content,
                                files: files,
                            },
                        });
                    }
                },
                successMessage ? { successMessage } : undefined,
            )
                .then(() => {
                    setInitialMarkdown(content);
                    setHasUnsavedChanges(false);
                })
                .catch(() => { })
                .finally(() => {
                    setSaving(false);
                });
        },
        [id, execute, fleetingNotesApi, notesApi, notify],
    );

    const handleSaveAsFinal = useCallback(async () => {
        if (!id || !markdownContent || markdownContent.trim().length === 0) {
            notify({ type: 'error', text: 'Cannot save empty note.' });
            return;
        }

        setSaving(true);
        execute(() => fleetingNotesApi.fleetingNotesFinalUpdate({ id }), {
            successMessage: 'Note finalized successfully.',
        })
            .then((response) => {
                // Navigate to the regular note view
                navigate(`/notes/${response.id}`, { replace: true });
            })
            .catch(() => { })
            .finally(() => {
                setSaving(false);
            });
    }, [id, markdownContent, fileData, navigate, fleetingNotesApi, execute, notify]);

    const handleRelinkNote = useCallback(() => {
        if (!id) return;

        managementApi
            .managementActionsCreate({
                actionName: 'relinkNotes',
                requestBody: {
                    note_id: id,
                },
            })
            .then(() => {
                notify({
                    type: 'info',
                    text: 'Relinking note...',
                });
            });
    }, [id, managementApi, notify]);

    const handlePublish = useCallback(() => {
        if (!note || !id) return;

        setModal(ReportGenerationModal, {
            noteId: id,
            noteTitle: note.title,
        });
    }, [id, note, setModal]);

    const handleDeleteWithConfirmation = useCallback(() => {
        setModal(ConfirmDeletionModal, {
            onConfirm: handleDelete,
            text: 'Are you sure you want to delete this note? This action is irreversible.',
        });
    }, [handleDelete, setModal]);

    const handleFilesChange = useCallback((files: FileReferenceWithNote[]) => {
        (async () => {
            if (isFleeting) {
                await execute(() => fleetingNotesApi.fleetingNotesUpdate({
                    id,
                    fleetingNoteRequest: {
                        files: files,
                    },
                }));
            } else {
                await execute(() => notesApi.notesUpdate({
                    noteId: id,
                    noteEditRequest: {
                        files: files,
                    },
                }));
            }
        })();

        setFileData(files);
    }, [setFileData, isFleeting]);

    const handleUploadFiles = useCallback((filesList?: any[]) => {
        setModal(FileUploadModal, {
            files: fileData,
            onFilesChange: handleFilesChange,
        });
    }, [fileData, setFileData, setModal]);

    const handleFind = useCallback(() => {
        const view = editorRef.current?.view || editorRef.current;
        if (!view) return;
        openSearchPanel(view);
    }, []);

    const handleReplace = useCallback(() => {
        const view = editorRef.current?.view || editorRef.current;
        if (!view) return;
        openSearchPanel(view);
        requestAnimationFrame(() => {
            const replaceInput = view.dom?.querySelector?.('input[name="replace"]') as
                | HTMLInputElement
                | null;
            if (replaceInput) {
                replaceInput.focus();
                replaceInput.select();
            }
        });
    }, []);

    const debouncedSaveNote = useMemo(
        () => debounce(handleSaveNote, 1500),
        [handleSaveNote],
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
        localStorage.setItem('richEditor', richEditor.toString());
    }, [richEditor]);

    // Compute note outline from markdown content
    useEffect(() => {
        const content = markdownContent || '';
        setNoteOutline(
            extractHeaderHierarchy(content, (lineNumber: number) => {
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
                        const targetLinePos = state.doc.line(
                            Math.max(1, lineNumber + 2),
                        ).from;
                        const selection = {
                            anchor: targetLinePos,
                            head: targetLinePos,
                        };

                        view.dispatch({
                            selection,
                            scrollIntoView: true,
                        });
                    }
                }
            }),
        );
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
            <div className='w-[100%] h-full flex flex-col'>
                <div className='w-full cradle-border-b px-4 py-3 flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        {!id?.startsWith('guide_') && note && (
                            <StatusIndicators
                                markdownContent={markdownContent}
                                saving={saving}
                                hasUnsavedChanges={hasUnsavedChanges}
                                isFleeting={!!note.fleeting}
                                noteStatus={note.status || null}
                                noteStatusMessage={note.statusMessage}
                            />
                        )}
                        {note && <NoteMetadata note={note} isFleeting={isFleeting} />}
                    </div>

                    <div className='flex items-center gap-2'>
                        {!id?.startsWith('guide_') && (
                            <>
                                {activeView === ViewMode.CONTENT && (
                                    <Tooltip content={enableEditing ? 'Edit' : 'View'}>
                                        <button
                                            onClick={() => {
                                                toggleEditing();
                                            }}
                                            className='w-full text-left px-2 py-2 text-sm cradle-text-secondary cradle-border hover:border-[#FF8C00] flex items-center gap-2'
                                            data-testid='toggle-editing-mode-menu-item'
                                        >
                                            {enableEditing ? (
                                                <EditPencil width='16' height='16' />
                                            ) : (
                                                <Eye width='16' height='16' />
                                            )}
                                            {/* <span className='flex-1'>{enableEditing ? 'Mode' : 'Preview Mode'}</span> */}
                                        </button>
                                    </Tooltip>
                                )}
                                <ViewsDropdown
                                    activeView={activeView}
                                    richEditor={richEditor}
                                    showViewsMenu={showViewsMenu}
                                    setShowViewsMenu={setShowViewsMenu}
                                    setActiveView={setActiveView}
                                    setRichEditor={setRichEditor}
                                    isAdmin={isAdmin()}
                                    isFleeting={isFleeting}
                                    hasFiles={fileData.length > 0}
                                />
                                <ActionsDropdown
                                    activeView={activeView}
                                    showActionsMenu={showActionsMenu}
                                    setShowActionsMenu={setShowActionsMenu}
                                    enableEditing={enableEditing}
                                    showOutline={showOutline}
                                    toggleOutline={toggleOutline}
                                    lspLoaded={lspLoaded}
                                    smartLink={smartLink}
                                    isAdmin={isAdmin()}
                                    handleRelinkNote={handleRelinkNote}
                                    isFleeting={isFleeting}
                                    handleSaveAsFinal={handleSaveAsFinal}
                                    saving={saving}
                                    handlePublish={handlePublish}
                                    handleDelete={handleDeleteWithConfirmation}
                                    handleUploadFiles={handleUploadFiles}
                                    handleFind={handleFind}
                                    handleReplace={handleReplace}
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
                                    <PanelGroup
                                        direction='horizontal'
                                        className='h-full'
                                    >
                                        {/* Outline sidebar - rendered once */}
                                        <Panel
                                            defaultSize={15}
                                            minSize={10}
                                            maxSize={30}
                                        >
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
                                                        editorUtils={editorUtils}
                                                        key={
                                                            richEditor
                                                                ? 'rich'
                                                                : 'source'
                                                        }
                                                        ref={editorRef}
                                                        noteid={id}
                                                        markdownContent={
                                                            markdownContent
                                                        }
                                                        setMarkdownContent={
                                                            setMarkdownContent
                                                        }
                                                        fileData={fileData}
                                                        setFileData={handleFilesChange}
                                                        source={!richEditor}
                                                        saveNote={handleSaveNote}
                                                        enableEditing={enableEditing}
                                                    />
                                                </div>

                                                {/* Reference Tree below the editor */}
                                                {note && (
                                                    <ReferenceTree note={note} className='mt-4' />
                                                )}
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
                                                setFileData={handleFilesChange}
                                                source={!richEditor}
                                                saveNote={handleSaveNote}
                                                enableEditing={enableEditing}
                                                editorUtils={editorUtils}
                                            />
                                        </div>

                                        {/* Reference Tree below the editor */}
                                        {note && (
                                            <ReferenceTree note={note} className='mt-4' />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Graph View */}
                    {activeView === ViewMode.GRAPH && note && id && (
                        <GraphExplorer GraphSearchComponent={NoteGraphSearch(id)} />
                    )}

                    {activeView === ViewMode.FILES && note && (
                        <FilesView
                            files={note.files || []}
                            copyToClipboard={copyToClipboard}
                        />
                    )}

                    {isAdmin() && activeView === ViewMode.HISTORY && id && (
                        <div className='pt-2'>
                            <ActivityList content_type='note' objectId={id} />
                        </div>
                    )}
                </div>
            </div >
        </>
    );
}
