import FileUploadModal from '@/components/modals/notes/FileUploadModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { useProfile } from '@/hooks/user/useProfile';
import { cn } from '@/lib/utils';
import { parseAPIError } from '@/utils/api';
import { CradleEditor } from '@/utils/editor/enhancements';
import extractHeaderHierarchy, { HeaderNode } from '@/utils/editor/outline';
import { logger } from '@/utils/logger';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type {
    FileReferenceWithNote,
    FileUploadFinalizeResponse,
    NoteRetrieve,
} from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { Book, EditPencil } from 'iconoir-react';
import { debounce } from 'lodash';
import 'prismjs/plugins/autoloader/prism-autoloader.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
    const { id } = useParams({ from: '/_authenticated/notes/$id' });
    const noteId = id || '';
    const router = useRouter();
    const queryClient = useQueryClient();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const locationState = (location.state as LocationState) || {};
    const { isAdmin, profile } = useProfile();
    const { from, state } = locationState;
    const [note, setNote] = useState<NoteRetrieve | null>(null);
    const [richEditor, setRichEditor] = useState(
        localStorage.getItem('richEditor')
            ? localStorage.getItem('richEditor') === 'true'
            : true,
    );
    const search = useSearch({ from: '/_authenticated/notes/$id' });
    const [enableEditing, setEnableEditing] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');
    const [enrichmentModalOpen, setEnrichmentModalOpen] = useState(false);
    const [enrichmentEntities, setEnrichmentEntities] = useState<
        Promise<Array<{ type: string; value: string }>> | undefined
    >(undefined);
    const [enrichmentArtifacts, setEnrichmentArtifacts] = useState<
        Promise<string> | undefined
    >(undefined);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
    const [fileData, setFileData] = useState<FileReferenceWithNote[]>([]);
    // Separate state for FileInput component (expects FileUploadFinalizeResponse[])
    const [uploadedFileData, setUploadedFileData] = useState<
        FileUploadFinalizeResponse[]
    >([]);
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
    const [showEditDialog, setShowEditDialog] = useState(false);
    const rawContentRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<any>(null);
    const lastLoadedNoteIdRef = useRef<string | null>(null);
    const { managementApi, notesApi, lspApi} = useApi();

    const finalizeNoteMutation = useMutation({
        mutationFn: async (noteId: string) => {
            return await notesApi.notesFinalUpdate({ noteId });
        },
        meta: {
            successMessage: 'Note finalized successfully.',
        },
        onSuccess: (response) => {
            router.navigate({ to: `/notes/${response.id}` as any, replace: true });
        },
    });

    const relinkNoteMutation = useMutation({
        mutationFn: async (noteId: string) => {
            await managementApi.managementActionsCreate({
                actionName: 'relinkNotes',
                requestBody: {
                    note_id: noteId,
                },
            });
        },
        meta: {
            successMessage: 'Note relinked successfully.',
        },
    });

    // Initialize editor utils for autolink functionality
    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(lspApi, notesApi, {}, setLspLoaded, async (error) => {
            const parsed = await parseAPIError(error);
            if (
                parsed.code !== 'UNAUTHENTICATED' &&
                parsed.code !== 'SESSION_EXPIRED'
            ) {
                toast.error(parsed.detail, { duration: 5000 });
            }
        });
    }, [notesApi, lspApi]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast.success('Copied to clipboard');
            })
            .catch((error) => {
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

        setShowEditDialog(true);
    }, [enableEditing]);

    const handleConfirmEdit = useCallback(() => {
        setShowEditDialog(false);
        toggleEditing();
    }, [toggleEditing]);

    const smartLink = useCallback(
        async (onlyTimestamps: boolean) => {
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
            if (changes > 0) {
                toast.success(
                    `${changes} link${changes == 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`,
                );
            } else {
                toast.info(
                    `No link${onlyTimestamps ? 's timestamped.' : 's found in text.'}`,
                );
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

        setEnrichmentEntities(entities);
        setEnrichmentArtifacts(artifacts);
        setEnrichmentModalOpen(true);
    }, [editorUtils]);

    useEffect(() => {
        if (!noteId) {
            logger.warn('NoteViewer - No note ID provided');
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
    }, [noteId]);

    // Query for note metadata
    const { data: noteData, isPending: isPendingNote } = useQuery({
        queryKey: queryKeys.notes.detail(noteId),
        queryFn: () =>
            notesApi.notesRetrieve({ noteId: noteId || '', footnotes: false }),
        enabled: !!noteId,
        meta: {
            showErrorToast: true,
            errorMessage: 'Note not found!',
        },
    });

    // Update state when note data is loaded
    useEffect(() => {
        if (!noteData) {
            setNote(null);
            setIsFleeting(false);
            setFileData([]);
            setMarkdownContent('');
            setInitialMarkdown('');
            return;
        }

        logger.info('NoteViewer - Note loaded successfully', { noteData });
        setNote(noteData);
        setIsFleeting(Boolean(noteData.fleeting));
        setMarkdownContent(noteData.content);
        setInitialMarkdown(noteData.content);
        setFileData(noteData.files || []);
        setHasUnsavedChanges(false);
        setIsLoading(false);
    }, [noteData]);

    // Mutation for deleting note
    const deleteMutation = useMutation({
        mutationFn: () => notesApi.notesDelete({ noteId: noteId }),
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.detail(noteId) },
                { queryKey: queryKeys.notes.lists() },
            ],
            successMessage: 'Note deleted successfully',
            errorMessage: 'Failed to delete note',
        },
    });

    // Use a ref to store the latest values for the save function
    const saveDataRef = useRef({ markdownContent, fileData, isFleeting });

    useEffect(() => {
        saveDataRef.current = { markdownContent, fileData, isFleeting };
    }, [markdownContent, fileData, isFleeting]);

    const saveNoteMutation = useMutation({
        mutationFn: async ({ content }: { content: string }) => {
            return await notesApi.notesUpdate({
                noteId: noteId || '',
                noteEditRequest: {
                    content: content,
                },
            });
        },
        meta: {
            suppressNotification: true,
        },
    });

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
            const successMessage = showAlert ? 'Note saved successfully.' : undefined;

            try {
                await saveNoteMutation.mutateAsync({ content });
                setInitialMarkdown(content);
                setHasUnsavedChanges(false);
                if (successMessage) {
                    toast.success(successMessage);
                }
            } catch (error) {
                const parsed = await parseAPIError(error);
                toast.error(`Failed to save note: ${parsed.detail}`);
            } finally {
                setSaving(false);
            }
        },
        [noteId, saveNoteMutation],
    );

    const handleDelete = useCallback(async () => {
        if (!id) return;

        try {
            await deleteMutation.mutateAsync();

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });

            // Navigate back - TanStack Router doesn't support setting state via navigate
            router.navigate({ to: (from?.pathname || '/') as any, replace: true });
        } catch (error) {
            // Error already handled by mutation
        }
    }, [noteId, deleteMutation, queryClient, router, id, state, from]);

    const handleSaveAsFinal = useCallback(() => {
        if (!id || !markdownContent || markdownContent.trim().length === 0) {
            toast.error('Cannot save empty note.');
            return;
        }

        setSaving(true);
        finalizeNoteMutation.mutate(noteId, {
            onSettled: () => {
                setSaving(false);
            },
        });
    }, [noteId, markdownContent, finalizeNoteMutation]);

    const handleRelinkNote = useCallback(() => {
        if (!id) return;
        relinkNoteMutation.mutate(noteId);
        toast.info('Relinking note...');
    }, [noteId, relinkNoteMutation]);

    const handlePublish = useCallback(() => {
        if (!note || !id) return;
        setReportModalOpen(true);
    }, [note, id]);

    const handleDeleteWithConfirmation = useCallback(() => {
        setDeleteModalOpen(true);
    }, []);

    const handleFilesChange = useCallback(
        (files: FileReferenceWithNote[]) => {
            setFileData(files);
        },
        [setFileData],
    );

    const handleUploadFiles = useCallback((filesList?: any[]) => {
        setFileUploadModalOpen(true);
    }, []);

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
                        key: 'Mod-s',
                        run: () => {
                            handleSaveNote(true);
                            return true;
                        },
                    },
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
        [handleFind, handleReplace, handleSaveNote],
    );

    const debouncedSaveNote = useMemo(
        () => debounce(handleSaveNote, 1500),
        [handleSaveNote],
    );

    // Auto-save when content changes
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
                <Spinner className='size-16' />
            </div>
        );
    }

    return (
        <>
            <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit Note</AlertDialogTitle>
                        <AlertDialogDescription>
                            Do you want to edit this note? This could be harmful.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmEdit}
                            className={cn(buttonVariants({ variant: 'destructive' }))}
                        >
                            Edit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className='w-[100%] h-full flex flex-col'>
                <div className='w-full border-b border-border px-4 py-3 flex items-center justify-between'>
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
                                    className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground border-border'
                                    data-testid='actions-dropdown-btn'
                                >
                                    {enableEditing ? (
                                        <EditPencil width='20' height='20' />
                                    ) : (
                                        <Book width='20' height='20' />
                                    )}
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
                    <div className='w-full px-4 py-2 border-b bg-muted'>
                        <FileInput
                            fileData={uploadedFileData}
                            setFileData={setUploadedFileData}
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
                            <div className='h-full w-full overflow-y-hidden'>
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
                                        <ResizableHandle className='w-[2px] border-x border-border hover:bg-primary hover:bg-opacity-50 transition-colors' />
                                        {/* Editor Panel - conditionally renders Rich or Normal editor */}
                                        <ResizablePanel defaultSize={85} minSize={50}>
                                            <div
                                                className='h-full flex flex-col border-l border-border relative'
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
                                                        key={`${noteId}-${richEditor ? 'rich' : 'source'}`}
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
                                        className='h-full flex flex-col border-l border-border relative'
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
                                                onClose={() => setShowFind(false)}
                                                initialReplace={findReplaceMode}
                                            />
                                        )}
                                        {/* Embedded Rich Editor */}
                                        <div className='flex-1 min-h-0'>
                                            <RichEditor
                                                additionalExtensions={customKeymap}
                                                key={`${noteId}-${richEditor ? 'rich' : 'source'}`}
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
            <EnrichmentRequestModal
                open={enrichmentModalOpen}
                onOpenChange={setEnrichmentModalOpen}
                entitiesList={enrichmentEntities}
                artifactsList={enrichmentArtifacts}
            />
            <ReportGenerationModal
                open={reportModalOpen}
                onOpenChange={setReportModalOpen}
                noteId={id}
                noteTitle={note?.title}
            />
            <ConfirmDeletionModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={handleDelete}
                text='Are you sure you want to delete this note? This action is irreversible.'
            />
            <FileUploadModal
                open={fileUploadModalOpen}
                onOpenChange={setFileUploadModalOpen}
                files={fileData}
                onFilesChange={handleFilesChange}
                noteId={id}
            />
        </>
    );
}
