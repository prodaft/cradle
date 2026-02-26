import FileUploadDialog from '@/components/domain/notes/dialogs/file-upload-dialog';
import ReportGenerationDialog from '@/components/domain/reports/dialogs/report-generation-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { parseAPIError } from '@/utils/api';
import { CradleEditor } from '@/utils/editor/enhancements';
import extractHeaderHierarchy, { HeaderNode } from '@/utils/editor/outline';
import { logger } from '@/utils/logger';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { BookOpenIcon, InfoIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import ConfirmDeletionDialog from '../../dialogs/base/confirm-deletion-dialog';
import NotFound from '../../feedback/not-found';
import ActivityList from '../activity/activity-list';
import { EnrichmentRequestDialog } from '../enrichment';
import GraphExplorer from '../graph/graph-explorer';
import NoteGraphSearch from '../graph/note-graph-search';
import ActionsDropdown from './actions-dropdown';
import { ViewMode } from './constants';
import FilesView from './files-view';
import FindReplace from './find-replace';
import NoteOutline from './note-outline';
import ReferenceTree from './reference-tree';
import RichEditor from './rich-editor';
import StaticRender from './static-render';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];
type NoteRetrieve = components['schemas']['NoteRetrieve'];

interface LocationState {
    from?: { pathname: string };
    state?: {
        notes?: NoteRetrieve[];
        [key: string]: unknown;
    };
}

const EMPTY_FILES: FileReferenceWithNote[] = [];

/**
 * NoteViewer component - displays note content with editing capabilities
 */
export default function NoteViewer() {
    const params = useParams({
        from: '/_authenticated/notes/$id' as any,
        strict: false,
    });
    const router = useRouter();
    const location = useLocation();
    const search = useSearch({ from: '/_authenticated/notes/$id' });
    const searchAny = search as any;
    const richEditor: boolean =
        searchAny.source !== undefined
            ? !searchAny.source
            : localStorage.getItem('richEditor') !== 'false';
    const enableEditing: boolean = searchAny.edit === true;
    const activeView: ViewMode = (searchAny.view as ViewMode) || ViewMode.CONTENT;

    const queryClient = useQueryClient();
    const noteId = useMemo(() => {
        const routeId = (params as { id?: string }).id;
        if (routeId) {
            return routeId;
        }
        const match = location.pathname.match(/\/notes\/([^/]+)/);
        return match?.[1] ?? '';
    }, [params, location.pathname]);
    const locationState = (location.state as LocationState) || {};
    const { isAdmin } = useAuthState();
    const { from } = locationState;

    const [note, setNote] = useState<NoteRetrieve | null>(null);
    const [markdownContent, setMarkdownContent] = useState('');
    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);
    const [enrichmentEntities, setEnrichmentEntities] = useState<
        Promise<Array<{ type: string; value: string }>> | undefined
    >(undefined);
    const [enrichmentArtifacts, setEnrichmentArtifacts] = useState<
        Promise<string> | undefined
    >(undefined);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [fileUploadDialogOpen, setFileUploadDialogOpen] = useState(false);
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
    const [fileData, setFileData] = useState<FileReferenceWithNote[]>([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [isFleeting, setIsFleeting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showFind, setShowFind] = useState(false);
    const [findReplaceMode, setFindReplaceMode] = useState(false);
    const [showOutline, setShowOutline] = useState(() => {
        const saved = localStorage.getItem('showOutline');
        return saved === 'true';
    });
    const [lineNumber, setLineNumber] = useState(0);
    const [noteOutline, setNoteOutline] = useState<HeaderNode[]>([]);
    const [lspLoaded, setLspLoaded] = useState(false);
    const editorRef = useRef<any>(null);
    const [navbarActionsEl, setNavbarActionsEl] = useState<HTMLElement | null>(null);
    useEffect(() => {
        const el = document.getElementById('navbar-actions');
        setNavbarActionsEl(el);
        return () => setNavbarActionsEl(null);
    }, []);

    const finalizeNoteMutation = useMutation({
        mutationFn: async (noteId: string) => {
            const { data, error, response } = await fetchClient.PUT(
                '/notes/{note_id}/final/',
                { params: { path: { note_id: noteId } } },
            );
            if (error) throw { response };
            return data;
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
            const { error, response } = await fetchClient.POST(
                '/management/actions/{action_name}',
                {
                    params: { path: { action_name: 'relinkNotes' } },
                    body: { note_id: noteId } as any,
                },
            );
            if (error) throw { response };
        },
        meta: {
            successMessage: 'Note relinked successfully.',
        },
    });

    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(setLspLoaded, async (error) => {
            const parsed = await parseAPIError(error);
            if (
                parsed.code !== 'UNAUTHENTICATED' &&
                parsed.code !== 'SESSION_EXPIRED'
            ) {
                toast.error(parsed.detail, { duration: 5000 });
            }
        });
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast.success('Copied to clipboard');
            })
            .catch((_error) => {
                toast.error('Failed to copy to clipboard');
            });
    };

    const handleViewChange = useCallback(
        (newView: ViewMode) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...(search as any), view: newView },
                replace: true,
            });
        },
        [router, location.pathname, search],
    );

    const handleRichEditorChange = useCallback(
        (rich: boolean) => {
            localStorage.setItem('richEditor', rich.toString());
            router.navigate({
                to: location.pathname as any,
                search: { ...(search as any), source: !rich },
                replace: true,
            });
        },
        [router, location.pathname, search],
    );

    const toggleOutline = useCallback(() => {
        const newValue = !showOutline;
        setShowOutline(newValue);
        localStorage.setItem('showOutline', newValue.toString());
    }, [showOutline]);

    const toggleEditing = useCallback(() => {
        router.navigate({
            to: location.pathname as any,
            search: { ...(search as any), edit: !enableEditing },
            replace: true,
        });
    }, [enableEditing, router, location.pathname, search]);

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
            const content = doc.doc.toString();

            if (to === from) {
                from = 0;
                to = content.length;
            }

            const [changes, linked] = await editorUtils.autoFormatLinks(
                view,
                from,
                to,
                onlyTimestamps,
                new Date(note?.edit_timestamp || note?.timestamp || new Date()),
            );

            view.dispatch({
                changes: { from: 0, to: content.length, insert: linked },
            });

            setMarkdownContent(linked);
            if (changes > 0) {
                toast.success(
                    `${changes} link${changes === 1 ? '' : 's'} ${onlyTimestamps ? 'timestamped.' : 'found in text.'}`,
                );
            } else {
                toast.info(
                    `No link${onlyTimestamps ? 's timestamped.' : 's found in text.'}`,
                );
            }
        },
        [editorUtils, note?.edit_timestamp, note?.timestamp],
    );

    const handleEnrichData = useCallback(async () => {
        if (!editorRef.current) return;
        const view = editorRef.current.view || editorRef.current;
        if (!view) return;

        let to = view.state.selection.main.to;
        let from = view.state.selection.main.from;
        const content = view.state.doc.toString();

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
        setEnrichmentDialogOpen(true);
    }, [editorUtils]);

    // Query for note metadata
    const {
        data: noteData,
        isLoading,
        isError,
    } = $api.useQuery(
        'get',
        '/notes/{note_id}/',
        {
            params: {
                path: { note_id: noteId || '' },
                query: { footnotes: false },
            },
        },
        {
            enabled: !!noteId,
            retry: false,
            meta: {
                showErrorToast: false,
            },
        },
    );

    const enableEditingRef = useRef({ enableEditing, router, location, search });
    useEffect(() => {
        enableEditingRef.current = { enableEditing, router, location, search };
    }, [enableEditing, router, location, search]);

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
        const nextIsFleeting = Boolean(noteData.fleeting);
        setIsFleeting(nextIsFleeting);
        if (nextIsFleeting && !enableEditingRef.current.enableEditing) {
            const { router: r, location: loc, search: s } = enableEditingRef.current;
            r.navigate({
                to: loc.pathname as any,
                search: { ...(s as any), edit: true },
                replace: true,
            });
        }
        setMarkdownContent(noteData.content);
        setInitialMarkdown(noteData.content);
        setFileData(noteData.files || EMPTY_FILES);
        setHasUnsavedChanges(false);
    }, [noteData]);

    // Mutation for deleting note
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: noteId } },
            });
            if (error) throw { response };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.detail(noteId) },
                { queryKey: queryKeys.notes.lists() },
            ],
            successMessage: 'Note deleted successfully',
        },
    });

    // Use a ref to store the latest values for the save function
    const saveDataRef = useRef({ markdownContent });

    useEffect(() => {
        saveDataRef.current = { markdownContent };
    }, [markdownContent]);

    const saveNoteMutation = useMutation({
        mutationFn: async ({ content }: { content: string }) => {
            const { data, error, response } = await fetchClient.POST(
                '/notes/{note_id}/',
                {
                    params: { path: { note_id: noteId || '' } },
                    body: { content },
                },
            );
            if (error) throw { response };
            return data;
        },
    });

    const handleSaveNote = useCallback(
        async (showAlert = false) => {
            if (!noteId) return;

            const { markdownContent: content } = saveDataRef.current;

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
            } catch {
                // Error toast handled by global mutation handler
            } finally {
                setSaving(false);
            }
        },
        [noteId, saveNoteMutation],
    );

    const handleDelete = useCallback(async () => {
        if (!noteId) return;

        try {
            await deleteMutation.mutateAsync();

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });

            // Navigate back - TanStack Router doesn't support setting state via navigate
            router.navigate({ to: (from?.pathname || '/') as any, replace: true });
        } catch (_error) {
            // Error already handled by mutation
        }
    }, [noteId, deleteMutation, queryClient, router, from]);

    const handleSaveAsFinal = useCallback(() => {
        if (!noteId || !markdownContent || markdownContent.trim().length === 0) {
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
        if (!noteId) return;
        relinkNoteMutation.mutate(noteId);
        toast.info('Relinking note...');
    }, [noteId, relinkNoteMutation]);

    const handlePublish = useCallback(() => {
        if (!note || !noteId) return;
        setReportDialogOpen(true);
    }, [note, noteId]);

    const handleDeleteWithConfirmation = useCallback(() => {
        setDeleteDialogOpen(true);
    }, []);

    const handleFilesChange = useCallback(
        (files: FileReferenceWithNote[]) => {
            setFileData(files);
        },
        [setFileData],
    );

    const handleUploadFiles = useCallback((_filesList?: any[]) => {
        setFileUploadDialogOpen(true);
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

    // Compute note outline from markdown content
    useEffect(() => {
        const content = markdownContent || '';
        setNoteOutline(
            extractHeaderHierarchy(
                content,
                (lineNumber: number) => {
                    // For editing mode: scroll to line in editor
                    if (!editorRef.current?.view || typeof lineNumber !== 'number')
                        return;

                    const view = editorRef.current.view;
                    if (view) {
                        const state = view.state;
                        if (lineNumber === 1) {
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
                },
                (headerText: string) => {
                    // For static render mode: scroll to anchor by header text
                    // Create slug same way as markdown-it-anchor
                    const slug = encodeURIComponent(
                        headerText.trim().toLowerCase().replace(/\s+/g, '-'),
                    );
                    const element = document.getElementById(slug);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
            ),
        );
    }, [markdownContent, editorRef]);

    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full w-full py-8'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (isError) {
        return <NotFound message='The note you are looking for does not exist.' />;
    }

    return (
        <>
            {/* Portal note actions into Navbar */}
            {navbarActionsEl &&
                createPortal(
                    <>
                        {note && !noteId?.startsWith('guide_') && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => setAboutDialogOpen(true)}
                                        className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground border-border'
                                        data-testid='about-note-btn'
                                    >
                                        <InfoIcon size={20} weight='bold' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>About</TooltipContent>
                            </Tooltip>
                        )}
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
                                        <PencilSimpleIcon size={20} weight='bold' />
                                    ) : (
                                        <BookOpenIcon size={20} weight='bold' />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {enableEditing ? 'Editing view' : 'Reading view'}
                            </TooltipContent>
                        </Tooltip>
                        {!noteId?.startsWith('guide_') && (
                            <ActionsDropdown
                                activeView={activeView}
                                richEditor={richEditor}
                                enableEditing={enableEditing}
                                setActiveView={handleViewChange}
                                setRichEditor={handleRichEditorChange}
                                showOutline={showOutline}
                                toggleOutline={toggleOutline}
                                lspLoaded={lspLoaded}
                                smartLink={smartLink}
                                isAdmin={isAdmin}
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
                        )}
                    </>,
                    navbarActionsEl,
                )}

            <div className='w-[100%] h-full flex flex-col'>
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
                                                className={cn(
                                                    'h-full flex flex-col border-l border-border relative',
                                                    !enableEditing &&
                                                        richEditor &&
                                                        'overflow-hidden',
                                                )}
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
                                                {/* Embedded Rich Editor or Static Render */}
                                                <div
                                                    className={cn(
                                                        'flex-1 min-h-0',
                                                        !enableEditing &&
                                                            richEditor &&
                                                            'overflow-hidden',
                                                    )}
                                                >
                                                    {enableEditing || !richEditor ? (
                                                        <>
                                                            <RichEditor
                                                                editorUtils={
                                                                    editorUtils
                                                                }
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
                                                                setFileData={
                                                                    handleFilesChange
                                                                }
                                                                source={!richEditor}
                                                                saveNote={
                                                                    handleSaveNote
                                                                }
                                                                enableEditing={
                                                                    enableEditing
                                                                }
                                                                setLineNumber={
                                                                    setLineNumber
                                                                }
                                                                saving={saving}
                                                                hasUnsavedChanges={
                                                                    hasUnsavedChanges
                                                                }
                                                            />
                                                            {/* Reference Tree below the editor */}
                                                            {note && (
                                                                <ReferenceTree
                                                                    note={note}
                                                                    className='mt-4'
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        note && (
                                                            <StaticRender
                                                                markdownContent={
                                                                    markdownContent
                                                                }
                                                                fileData={fileData}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                ) : (
                                    <div
                                        className={cn(
                                            'h-full flex flex-col border-l border-border relative',
                                            !enableEditing &&
                                                richEditor &&
                                                'overflow-hidden',
                                        )}
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
                                        {/* Embedded Rich Editor or Static Render */}
                                        <div
                                            className={cn(
                                                'flex-1 min-h-0',
                                                !enableEditing &&
                                                    richEditor &&
                                                    'overflow-hidden',
                                            )}
                                        >
                                            {enableEditing || !richEditor ? (
                                                <>
                                                    <RichEditor
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
                                                        editorUtils={editorUtils}
                                                        setLineNumber={setLineNumber}
                                                        saving={saving}
                                                        hasUnsavedChanges={
                                                            hasUnsavedChanges
                                                        }
                                                    />
                                                    {/* Reference Tree below the editor */}
                                                    {note && (
                                                        <ReferenceTree
                                                            note={note}
                                                            className='mt-4'
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                note && (
                                                    <StaticRender
                                                        markdownContent={
                                                            markdownContent
                                                        }
                                                        fileData={fileData}
                                                    />
                                                )
                                            )}
                                        </div>
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

                    {isAdmin && activeView === ViewMode.HISTORY && noteId && (
                        <div className='py-4 px-4'>
                            <ActivityList content_type='note' objectId={noteId} />
                        </div>
                    )}
                </div>
            </div>
            <EnrichmentRequestDialog
                open={enrichmentDialogOpen}
                onOpenChange={setEnrichmentDialogOpen}
                entitiesList={enrichmentEntities}
                artifactsList={enrichmentArtifacts}
            />
            <ReportGenerationDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                noteId={noteId}
                noteTitle={note?.title}
            />
            <ConfirmDeletionDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                text='Are you sure you want to delete this note? This action is irreversible.'
            />
            <FileUploadDialog
                open={fileUploadDialogOpen}
                onOpenChange={setFileUploadDialogOpen}
                files={fileData}
                onFilesChange={handleFilesChange}
                noteId={noteId}
            />
            {note && (
                <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>About</DialogTitle>
                        </DialogHeader>
                        <FieldSet className='gap-3 pt-1'>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor='about-created'>
                                        Created at
                                    </FieldLabel>
                                    <Input
                                        id='about-created'
                                        readOnly
                                        className='text-muted-foreground bg-muted/50'
                                        value={
                                            note.timestamp
                                                ? format(
                                                      new Date(note.timestamp),
                                                      'dd/MM/yyyy, HH:mm',
                                                  )
                                                : 'N/A'
                                        }
                                    />
                                </Field>
                                {!isFleeting && (
                                    <Field>
                                        <FieldLabel htmlFor='about-author'>
                                            Author
                                        </FieldLabel>
                                        <Input
                                            id='about-author'
                                            readOnly
                                            className='bg-muted/50'
                                            value={
                                                note?.author
                                                    ? note.author.username
                                                    : 'Unknown'
                                            }
                                        />
                                    </Field>
                                )}
                                {!isFleeting && note.editor && (
                                    <>
                                        <Field>
                                            <FieldLabel htmlFor='about-edited'>
                                                Edited at
                                            </FieldLabel>
                                            <Input
                                                id='about-edited'
                                                readOnly
                                                className='text-muted-foreground bg-muted/50'
                                                value={
                                                    note.edit_timestamp
                                                        ? format(
                                                              new Date(
                                                                  note.edit_timestamp,
                                                              ),
                                                              'dd/MM/yyyy, HH:mm',
                                                          )
                                                        : 'N/A'
                                                }
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor='about-editor'>
                                                Editor
                                            </FieldLabel>
                                            <Input
                                                id='about-editor'
                                                readOnly
                                                className='bg-muted/50'
                                                value={
                                                    note?.editor
                                                        ? note.editor.username
                                                        : 'Unknown'
                                                }
                                            />
                                        </Field>
                                    </>
                                )}
                                {note.last_linked && (
                                    <Field>
                                        <FieldLabel htmlFor='about-last-linked'>
                                            Last linked
                                        </FieldLabel>
                                        <Input
                                            id='about-last-linked'
                                            readOnly
                                            className='text-muted-foreground bg-muted/50'
                                            value={format(
                                                new Date(note.last_linked),
                                                'dd/MM/yyyy, HH:mm',
                                            )}
                                        />
                                    </Field>
                                )}
                            </FieldGroup>
                        </FieldSet>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
