import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FileUploadModal from '@/components/modals/notes/FileUploadModal';
import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { CradleEditor } from '@/utils/editor/enhancements';
import extractHeaderHierarchy, { HeaderNode } from '@/utils/editor/outline';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { FileReferenceWithNote, NoteRetrieve } from '@services/cradle/models';
import { Book, EditPencil } from 'iconoir-react';
import { debounce } from 'lodash';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import FileInput from '../../forms/FileInput';
import ConfirmDeletionModal from '../../modals/base/ConfirmDeletionModal';
import ReportGenerationModal from '../../modals/reports/ReportGenerationModal';
import ActivityList from '../activity/ActivityList';
import { EnrichmentRequestModal } from '../enrichment';
import GraphExplorer from '../graph/GraphExplorer';
import NoteGraphSearch from '../graph/NoteGraphSearch';
import ReferenceTree from '../relations/ReferenceTree';
import ActionsDropdown from './ActionsDropdown';
import { ViewMode } from './constants';
import FilesView from './FilesView';
import FindReplace from './FindReplace';
import NoteMetadata from './NoteMetadata';
import NoteOutline from './NoteOutline';
import RichEditor from './RichEditor';
import StatusIndicators from './StatusIndicators';

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
    const { id } = useParams<{ id: string }>();
    const noteId = id || '';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [enableEditing, setEnableEditing] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');
    const { setModal } = useModal();
    const [fileData, setFileData] = useState<FileReferenceWithNote[]>([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ViewMode>(ViewMode.CONTENT);
    const [isFleeting, setIsFleeting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showFind, setShowFind] = useState(false);
    const [findReplaceMode, setFindReplaceMode] = useState(false);
    const [showOutline, setShowOutline] = useState(() => {
        const saved = localStorage.getItem('showOutline');
        return saved === 'true';
    });
    const [lineNumber, setLineNumber] = useState(0);
    const [noteOutline, setNoteOutline] = useState<HeaderNode[]>([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const rawContentRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<any>(null);
    const lastLoadedNoteIdRef = useRef<string | null>(null);
    const { managementApi, fleetingNotesApi, notesApi, lspApi } = useApi();
    const { execute, handleError } = useAPICall();

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(lspApi, notesApi, {}, setLspLoaded, (error) =>
            handleError(error, { suppressNotification: false }),
        );
    }, [notesApi, lspApi]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast.success('Copied to clipboard');
            })
            .catch((error) => {
                console.error('Failed to copy text: ', error);
                toast.error('Failed to copy to clipboard');
            });
    };

    const toggleOutline = useCallback(() => {
        const newValue = !showOutline;
        setShowOutline(newValue);
        localStorage.setItem('showOutline', newValue.toString());
    }, [showOutline]);

    const toggleEditing = useCallback(() => {
        setEnableEditing((prev) => !prev);
    }, []);

    const handleEnableEditingWithConfirmation = useCallback(() => {
        // If we're already in editing mode, there's nothing to do
        if (enableEditing) {
            return;
        }

        toggleEditing();
        toast.info('Double click detected. Enabling editing mode.');
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

            console.log(view);

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
            if (changes > 0) {
                toast.success(`${changes} link${changes == 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`);
            } else {
                toast.info(`No link${onlyTimestamps ? 's timestamped.' : 's found in text.'}`);
            }
        },
        [editorUtils, setMarkdownContent],
    );

    const handleEnrichData = useCallback(async () => {
        if (!editorRef.current) return;
        const view = editorRef.current.view || editorRef.current;
        if (!view) return;

        let to = view.state.selection.main.to;
        let from = view.state.selection.main.from;
        let content = view.state.doc.toString();

        if (to === from) {
            from = 0;
            to = content.length;
        }
        const result = editorUtils.artifactsAndEntries(view, from, to);
        const entities = result.then((result) => result.entities);
        const artifacts = result.then((result) =>
            result.artifacts
                .map((artifact) => `${artifact.type}:${artifact.value}`)
                .join('\n'),
        );

        setModal(EnrichmentRequestModal, {
            entitiesList: entities,
            artifactsList: artifacts,
        });
    }, [editorUtils, setModal]);

    useEffect(() => {
        if (!noteId) {
            console.warn('NoteViewer - No note ID provided');
            setIsLoading(false);
            lastLoadedNoteIdRef.current = null;
            return;
        }

        // Skip loading if we've already loaded this exact note ID
        // This prevents re-fetching when only search params change
        if (lastLoadedNoteIdRef.current === noteId) {
            return;
        }

        setIsLoading(true);
        lastLoadedNoteIdRef.current = noteId || null;

        // Try to load as regular note first, then fallback to fleeting note if it fails
        const loadNote = async () => {
            try {
                // First try to load as a regular note
                const responseNote = await execute(() =>
                    notesApi.notesRetrieve({ noteId: noteId || '', footnotes: false }),
                );

                // Check if this is a fleeting note using the fleeting field
                const isFleetingNote = responseNote.fleeting === true;
                setIsFleeting(isFleetingNote);

                // Debug logging
                console.log('NoteViewer - Note loaded successfully:', {
                    id: noteId,
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
                console.log('NoteViewer - Attempting fleeting note with ID:', noteId);
                const responseNote = await execute(
                    () => fleetingNotesApi.fleetingNotesRetrieve({ id: noteId }),
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
                // Update tab title with note title (use refs to avoid dependency issues)
                // Note loaded successfully
                return responseNote;
            })
            .catch(() => {})
            .finally(() => {
                // Turn off loading spinner regardless of success or failure
                setIsLoading(false);
            });
    }, [
        noteId,
        execute,
        notesApi,
        fleetingNotesApi,
    ]);

    const handleDelete = useCallback(async () => {
        if (!note || !id) return;

        execute(async () => {
            // Use the appropriate delete function based on whether the note is fleeting
            if (note.fleeting) {
                await fleetingNotesApi.fleetingNotesDestroy({ id: noteId });
            } else {
                await notesApi.notesDelete({ noteId: noteId });
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
    }, [noteId, execute, navigate, note, fleetingNotesApi, notesApi, state, from]);

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
                toast.error('Cannot save empty note.');
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
                            id: noteId,
                            fleetingNoteRequest: {
                                content,
                            },
                        });
                    } else {
                        // Update regular note
                        await notesApi.notesUpdate({
                            noteId: noteId || '',
                            noteEditRequest: {
                                content: content,
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
                .catch(() => {})
                .finally(() => {
                    setSaving(false);
                });
        },
        [noteId, execute, fleetingNotesApi, notesApi],
    );

    const handleSaveAsFinal = useCallback(async () => {
        if (!id || !markdownContent || markdownContent.trim().length === 0) {
            toast.error('Cannot save empty note.');
            return;
        }

        setSaving(true);
        execute(() => fleetingNotesApi.fleetingNotesFinalUpdate({ id: noteId }), {
            successMessage: 'Note finalized successfully.',
        })
            .then((response) => {
                // Navigate to the regular note view
                navigate(`/notes/${response.id}`, { replace: true });
            })
            .catch(() => {})
            .finally(() => {
                setSaving(false);
            });
    }, [noteId, markdownContent, fileData, navigate, fleetingNotesApi, execute]);

    const handleRelinkNote = useCallback(() => {
        if (!id) return;

        managementApi
            .managementActionsCreate({
                actionName: 'relinkNotes',
                requestBody: {
                    note_id: noteId,
                },
            })
            .then(() => {
                toast.info('Relinking note...');
            });
    }, [noteId, managementApi]);

    const handlePublish = useCallback(() => {
        if (!note || !id) return;

        setModal(ReportGenerationModal, {
            noteId: id,
            noteTitle: note.title,
        });
    }, [noteId, note, setModal]);

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
                    id: noteId || '',
                    fleetingNoteRequest: {
                        files: files,
                    },
                }));
            } else {
                await execute(() => notesApi.notesUpdate({
                    noteId: noteId || '',
                    noteEditRequest: {
                        files: files,
                    },
                }));
            }
        })();

        setFileData(files);
    }, [setFileData, isFleeting, noteId, execute, fleetingNotesApi, notesApi]);

    const handleUploadFiles = useCallback(
        (filesList?: any[]) => {
            setModal(FileUploadModal, {
                files: fileData,
                onFilesChange: handleFilesChange,
                noteId: id,
            });
        },
        [fileData, handleFilesChange, setModal, id],
    );

    const handleFind = useCallback(() => {
        setShowFind(true);
        setFindReplaceMode(false);
    }, []);

    const handleReplace = useCallback(() => {
        setShowFind(true);
        setFindReplaceMode(true);
    }, []);

    const customKeymap = useMemo(
        () => [
            Prec.highest(
                keymap.of([
                    {
                        key: 'Mod-f',
                        run: () => {
                            handleFind();
                            return true;
                        },
                    },
                    {
                        key: 'Mod-h',
                        run: () => {
                            handleReplace();
                            return true;
                        },
                    },
                ]),
            ),
        ],
        [handleFind, handleReplace],
    );

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
                        {!noteId?.startsWith('guide_') && note && (
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => toggleEditing()}
                                    className='p-2 w-8 h-8 flex items-center justify-center cradle-text-tertiary hover:bg-cradle-bg-secondary hover:text-cradle-text-primary cradle-border'
                                    data-testid='actions-dropdown-btn'
                                >
                                    {
                                        enableEditing ? <EditPencil width='20' height='20' /> : <Book width='20' height='20' />
                                    }

                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {enableEditing ? 'Editing mode' : 'Reading mode'}
                            </TooltipContent>
                        </Tooltip>
                        {!noteId?.startsWith('guide_') && (
                            <>
                                <ActionsDropdown
                                    activeView={activeView}
                                    richEditor={richEditor}
                                    enableEditing={enableEditing}
                                    toggleEditing={toggleEditing}
                                    setActiveView={setActiveView}
                                    setRichEditor={setRichEditor}
                                    showOutline={showOutline}
                                    toggleOutline={toggleOutline}
                                    lspLoaded={lspLoaded}
                                    smartLink={smartLink}
                                    isAdmin={isAdmin()}
                                    handleRelinkNote={handleRelinkNote}
                                    isFleeting={isFleeting}
                                    hasFiles={fileData.length > 0}
                                    handleSaveAsFinal={handleSaveAsFinal}
                                    saving={saving}
                                    handlePublish={handlePublish}
                                    handleDelete={handleDeleteWithConfirmation}
                                    handleUploadFiles={handleUploadFiles}
                                    handleFind={handleFind}
                                    handleReplace={handleReplace}
                                    enrichData={handleEnrichData}
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
                            noteId={id}
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
                                    <ResizablePanelGroup
                                        direction='horizontal'
                                        className='h-full'
                                    >
                                        {/* Outline sidebar - rendered once */}
                                        <ResizablePanel
                                            defaultSize={15}
                                            minSize={10}
                                            maxSize={30}
                                        >
                                            <ScrollArea className='h-full pr-2'>
                                                <NoteOutline
                                                    data={noteOutline}
                                                    title='Note Outline'
                                                    showSeparators={true}
                                                    currentLine={lineNumber}
                                                />
                                            </ScrollArea>
                                        </ResizablePanel>
                                        <ResizableHandle className='w-[2px] cradle-border-x hover:bg-[#FF8C00] hover:bg-opacity-50 transition-colors' />
                                        {/* Editor Panel - conditionally renders Rich or Normal editor */}
                                        <ResizablePanel defaultSize={85} minSize={50}>
                                            <div
                                                className='h-full flex flex-col border-l cradle-border relative'
                                                onDoubleClick={
                                                    handleEnableEditingWithConfirmation
                                                }
                                            >
                                                {showFind && (
                                                    <FindReplace
                                                        view={
                                                            editorRef.current?.view ||
                                                            editorRef.current
                                                        }
                                                        onClose={() =>
                                                            setShowFind(false)
                                                        }
                                                        initialReplace={findReplaceMode}
                                                    />
                                                )}
                                                {/* Embedded Rich Editor */}
                                                <div className='flex-1 min-h-0'>
                                                    <RichEditor
                                                        editorUtils={editorUtils}
                                                        additionalExtensions={
                                                            customKeymap
                                                        }
                                                        key={
                                                            richEditor
                                                                ? 'rich'
                                                                : 'source'
                                                        }
                                                        ref={editorRef}
                                                        noteid={noteId || ''}
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
                                                        setLineNumber={setLineNumber}
                                                    />
                                                </div>

                                                {/* Reference Tree below the editor */}
                                                {note && (
                                                    <ReferenceTree
                                                        note={note}
                                                        className='mt-4'
                                                    />
                                                )}
                                            </div>
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                                                ) : (
                                                                    <div
                                                                        className='h-full flex flex-col border-l cradle-border relative'
                                                                        onDoubleClick={handleEnableEditingWithConfirmation}
                                                                    >
                                                                        {showFind && (
                                                                            <FindReplace
                                                                                view={
                                                                                    editorRef.current?.view ||
                                                                                    editorRef.current
                                                                                }
                                                                                onClose={() =>
                                                                                    setShowFind(false)
                                                                                }
                                                                                initialReplace={findReplaceMode}
                                                                            />
                                                                        )}
                                                                        {/* Embedded Rich Editor */}
                                                                        <div className='flex-1 min-h-0'>
                                                                            <RichEditor
                                                                                additionalExtensions={
                                                                                    customKeymap
                                                                                }
                                                                                key={
                                                                                    richEditor
                                                                                        ? 'rich'
                                                                                        : 'source'
                                                                                }
                                                ref={editorRef}
                                                noteid={noteId || ''}
                                                markdownContent={markdownContent}
                                                setMarkdownContent={setMarkdownContent}
                                                fileData={fileData}
                                                setFileData={handleFilesChange}
                                                source={!richEditor}
                                                saveNote={handleSaveNote}
                                                enableEditing={enableEditing}
                                                editorUtils={editorUtils}
                                                setLineNumber={setLineNumber}
                                            />
                                        </div>

                                        {/* Reference Tree below the editor */}
                                        {note && (
                                            <ReferenceTree
                                                note={note}
                                                className='mt-4'
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Graph View */}
                    {activeView === ViewMode.GRAPH && note && noteId && (
                        <GraphExplorer GraphSearchComponent={NoteGraphSearch(noteId)} />
                    )}

                    {activeView === ViewMode.FILES && note && (
                        <FilesView
                            files={fileData || []}
                            copyToClipboard={copyToClipboard}
                        />
                    )}

                    {isAdmin() && activeView === ViewMode.HISTORY && noteId && (
                        <div className='pt-2'>
                            <ActivityList content_type='note' objectId={noteId} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
