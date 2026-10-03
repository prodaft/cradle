import FileUploadDialog from '@/components/domain/notes/dialogs/file-upload-dialog';
import ReportGenerationDialog from '@/components/domain/reports/dialogs/report-generation-dialog';
import NotFound from '@/components/feedback/not-found';
import {
    useDockPanelActiveForNavbar,
    useDockPanelTab,
    type DockPanelTabMetadata,
} from '@/components/layout/dock-panel-tab-context';
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
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { getDisplayMessage, parseAPIError } from '@/utils/api';
import { CradleEditor } from '@/utils/editor/enhancements';
import extractHeaderHierarchy, { HeaderNode } from '@/utils/editor/outline';
import { parseMarkdownInline } from '@/utils/parser';
import { Prec } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
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
type NoteMetadata = { title?: string; description?: string };

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
    const search = useSearch({ from: '/_authenticated/notes/$id' }) as {
        source?: boolean;
        view?: ViewMode;
    };
    const richEditor: boolean =
        search.source !== undefined
            ? !search.source
            : localStorage.getItem('richEditor') !== 'false';
    const activeView: ViewMode = search.view || ViewMode.CONTENT;

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
    const [isEnrichOpen, setIsEnrichOpen] = useState(false);
    const [enrichmentEntities, setEnrichmentEntities] = useState<
        Promise<Array<{ type: string; value: string }>> | undefined
    >(undefined);
    const [enrichmentArtifacts, setEnrichmentArtifacts] = useState<
        Promise<string> | undefined
    >(undefined);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [files, setFiles] = useState<FileReferenceWithNote[]>([]);
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const [isFleeting, setIsFleeting] = useState(false);
    const [enableEditing, setEnableEditing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFindOpen, setIsFindOpen] = useState(false);
    const [isReplaceMode, setIsReplaceMode] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(() => {
        return localStorage.getItem('showOutline') === 'true';
    });
    const [lineNumber, setLineNumber] = useState(0);
    const [noteOutline, setNoteOutline] = useState<HeaderNode[]>([]);
    const [isLspLoaded, setIsLspLoaded] = useState(false);
    const editorRef = useRef<any>(null);
    const [findPanelEditorView, setFindPanelEditorView] = useState<EditorView | null>(
        null,
    );
    const [navbarActionsEl, setNavbarActionsEl] = useState<HTMLElement | null>(null);

    const isNavbarActive = useDockPanelActiveForNavbar();

    useEffect(() => {
        setFindPanelEditorView(null);
    }, [noteId]);

    useEffect(() => {
        const el = document.getElementById('navbar-actions');
        setNavbarActionsEl(el);
        return () => setNavbarActionsEl(null);
    }, []);

    const finalizeNote = useMutation({
        mutationFn: async (noteId: string) => {
            const { data, error, response } = await fetchClient.PUT(
                '/notes/{note_id}/finalize/',
                { params: { path: { note_id: noteId } } },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetail(noteId) },
                { queryKey: queryKeys.notes.apiList() },
            ],
            successMessage: 'Note finalized successfully.',
        },
        onSuccess: (response) => {
            router.navigate({ to: `/notes/${response.id}` as any, replace: true });
        },
    });

    const relinkNote = useMutation({
        mutationFn: async (noteId: string) => {
            const { error, response } = await fetchClient.POST(
                '/notes/{note_id}/relink/',
                { params: { path: { note_id: noteId } }, body: undefined },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetail(noteId) },
                { queryKey: queryKeys.notes.apiList() },
            ],
            successMessage: 'Note relinked successfully.',
        },
    });

    const editorUtils = React.useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(null, async (error) => {
            const parsed = await parseAPIError(error);
            if (
                parsed.code !== 'UNAUTHENTICATED' &&
                parsed.code !== 'SESSION_EXPIRED'
            ) {
                toast.error(getDisplayMessage(parsed), { duration: 5000 });
            }
        });
    }, []);

    // Subscribe after mount: the instance is created during render, so a setter passed
    // to its constructor could fire for a render React discarded before committing.
    useEffect(() => {
        let cancelled = false;
        editorUtils.ready().then((ready) => {
            if (!cancelled) setIsLspLoaded(ready);
        });
        return () => {
            cancelled = true;
        };
    }, [editorUtils]);

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

    const changeView = useCallback(
        (view: ViewMode) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...(search as any), view },
                replace: true,
            });
        },
        [router, location.pathname, search],
    );

    const changeRichEditor = useCallback(
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
        const newValue = !isOutlineOpen;
        setIsOutlineOpen(newValue);
        localStorage.setItem('showOutline', newValue.toString());
    }, [isOutlineOpen]);

    const toggleEditing = useCallback(() => {
        setEnableEditing((current) => !current);
    }, []);

    const smartLink = useCallback(
        async (onlyTimestamps: boolean) => {
            if (!editorRef.current) {
                return;
            }

            const view = editorRef.current?.view;
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

    const enrich = useCallback(async () => {
        if (!editorRef.current) return;
        const view = editorRef.current?.view;
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
        setIsEnrichOpen(true);
    }, [editorUtils]);

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

    const dockPanelTab = useMemo((): DockPanelTabMetadata => {
        if (isError) {
            return { title: 'Not found', icon: 'not-found' };
        }
        const src = noteData ?? note;
        const isSourceFleeting = Boolean(src?.fleeting);
        const raw = (
            (src?.metadata as NoteMetadata | undefined)?.title ||
            src?.title ||
            ''
        ).trim();
        let parsedTitle: string;
        try {
            parsedTitle = (parseMarkdownInline(raw) ?? '').trim() || raw;
        } catch {
            parsedTitle = raw;
        }
        const icon = isSourceFleeting ? 'fleeting-note' : 'notes';
        if (!parsedTitle) {
            return {
                title: isSourceFleeting ? 'Fleeting note' : 'Note',
                icon,
            };
        }
        const prefix = isSourceFleeting ? 'Fleeting note' : 'Note';
        const title =
            parsedTitle.length > 56
                ? `${prefix}: ${parsedTitle.slice(0, 53)}...`
                : `${prefix}: ${parsedTitle}`;
        return { title, icon };
    }, [isError, note, noteData]);
    useDockPanelTab(dockPanelTab);

    const permissionSource = noteData ?? note;
    const isReadable =
        permissionSource?.permission === 'read' ||
        permissionSource?.permission === 'read-write';
    const isWritable = permissionSource?.permission === 'read-write';
    const hasFiles = files.length > 0;

    const enableEditingRef = useRef(enableEditing);
    useEffect(() => {
        enableEditingRef.current = enableEditing;
    }, [enableEditing]);

    const editorDraftRef = useRef({ markdownContent: '', initialMarkdown: '' });
    editorDraftRef.current = { markdownContent, initialMarkdown };

    const prevNoteIdForDetailRef = useRef<string | null>(null);

    useEffect(() => {
        if (!noteData) {
            setNote(null);
            setIsFleeting(false);
            setFiles([]);
            setMarkdownContent('');
            setInitialMarkdown('');
            prevNoteIdForDetailRef.current = null;
            return;
        }

        const switchedNote = prevNoteIdForDetailRef.current !== noteId;
        prevNoteIdForDetailRef.current = noteId;
        setNote(noteData);
        const nextIsFleeting = Boolean(noteData.fleeting);
        setIsFleeting(nextIsFleeting);
        const nextCanWrite = noteData.permission === 'read-write';
        if (switchedNote) {
            setEnableEditing(nextCanWrite && nextIsFleeting);
        } else if (!nextCanWrite && enableEditingRef.current) {
            setEnableEditing(false);
        } else if (nextIsFleeting && nextCanWrite && !enableEditingRef.current) {
            setEnableEditing(true);
        }

        const { markdownContent: md, initialMarkdown: init } = editorDraftRef.current;
        const applyServerBody =
            switchedNote || (md === init && noteData.content !== md);

        if (applyServerBody) {
            setMarkdownContent(noteData.content);
            setInitialMarkdown(noteData.content);
            setIsDirty(false);
        }

        setFiles(noteData.files || EMPTY_FILES);
    }, [noteData, noteId]);

    const deleteNote = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE('/notes/{note_id}/', {
                params: { path: { note_id: noteId } },
            });
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetail(noteId) },
                { queryKey: queryKeys.notes.apiList() },
            ],
            successMessage: 'Note deleted successfully',
        },
    });

    const lastSaveFailedRef = useRef(false);

    useEffect(() => {
        lastSaveFailedRef.current = false;
    }, [noteId]);

    const saveNoteMutation = useMutation({
        mutationFn: async ({ content }: { content: string }) => {
            const { data, error, response } = await fetchClient.PATCH(
                '/notes/{note_id}/',
                {
                    params: { path: { note_id: noteId || '' } },
                    body: { content },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.notes.apiDetail(noteId || '') },
                { queryKey: queryKeys.notes.apiList() },
            ],
        },
    });

    const save = useCallback(async () => {
        if (!noteId) return;

        const content = editorDraftRef.current.markdownContent;

        if (!content || content.trim().length === 0) {
            toast.error('Cannot save empty note.');
            return;
        }

        setIsSaving(true);

        try {
            await saveNoteMutation.mutateAsync({ content });
            lastSaveFailedRef.current = false;
            setInitialMarkdown(content);
            setIsDirty(false);
        } catch {
            lastSaveFailedRef.current = true;
            // Error toast handled by global mutation handler
        } finally {
            setIsSaving(false);
        }
    }, [noteId, saveNoteMutation]);

    const deleteCurrentNote = useCallback(async () => {
        if (!noteId) return;

        try {
            await deleteNote.mutateAsync();

            queryClient.invalidateQueries({ queryKey: queryKeys.notes.apiList() });

            router.navigate({ to: (from?.pathname || '/') as any, replace: true });
        } catch (_error) {
            // Error already handled by mutation
        }
    }, [noteId, deleteNote, queryClient, router, from]);

    const finalize = useCallback(() => {
        if (!noteId || !markdownContent || markdownContent.trim().length === 0) {
            toast.error('Cannot save empty note.');
            return;
        }

        setIsSaving(true);
        finalizeNote.mutate(noteId, {
            onSettled: () => {
                setIsSaving(false);
            },
        });
    }, [noteId, markdownContent, finalizeNote]);

    const relink = useCallback(() => {
        if (!noteId) return;
        relinkNote.mutate(noteId);
        toast.info('Relinking note...');
    }, [noteId, relinkNote]);

    const publish = useCallback(() => {
        if (!note || !noteId) return;
        setIsReportOpen(true);
    }, [note, noteId]);

    const confirmDelete = useCallback(() => {
        setIsDeleteOpen(true);
    }, []);

    const openUpload = useCallback((_filesList?: any[]) => {
        setIsUploadOpen(true);
    }, []);

    const find = useCallback(() => {
        setIsFindOpen(true);
        setIsReplaceMode(false);
    }, []);

    const replace = useCallback(() => {
        setIsFindOpen(true);
        setIsReplaceMode(true);
    }, []);

    const handleEditorViewChange = useCallback(
        (view: EditorView | null) => setFindPanelEditorView(view),
        [],
    );

    const customKeymap = useMemo(() => {
        const bindings = [
            {
                key: 'Mod-f',
                run: () => {
                    find();
                    return true;
                },
            },
        ];
        if (isWritable) {
            bindings.push(
                {
                    key: 'Mod-s',
                    run: () => {
                        save();
                        return true;
                    },
                },
                {
                    key: 'Mod-h',
                    run: () => {
                        replace();
                        return true;
                    },
                },
            );
        }
        return [Prec.highest(keymap.of(bindings))];
    }, [find, replace, save, isWritable]);

    const debouncedSave = useMemo(() => debounce(save, 1500), [save]);

    useEffect(() => {
        if (
            !enableEditing ||
            !isWritable ||
            !markdownContent ||
            markdownContent === initialMarkdown
        ) {
            debouncedSave.cancel();
            return;
        }

        setIsDirty(true);
        if (lastSaveFailedRef.current) {
            debouncedSave.cancel();
            return;
        }
        debouncedSave();

        return () => {
            debouncedSave.cancel();
        };
    }, [enableEditing, isWritable, markdownContent, initialMarkdown, debouncedSave]);

    useEffect(() => {
        const content = markdownContent || '';
        setNoteOutline(
            extractHeaderHierarchy(
                content,
                (lineNumber: number) => {
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
                isNavbarActive &&
                createPortal(
                    <>
                        {note && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => setIsAboutOpen(true)}
                                        className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        data-testid='about-note-btn'
                                    >
                                        <InfoIcon size={20} weight='bold' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>About</TooltipContent>
                            </Tooltip>
                        )}
                        {isWritable && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => toggleEditing()}
                                        className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        data-testid='edit-mode-toggle-btn'
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
                        )}
                        {isReadable && (
                            <ActionsDropdown
                                activeView={activeView}
                                richEditor={richEditor}
                                enableEditing={enableEditing && isWritable}
                                setActiveView={changeView}
                                setRichEditor={changeRichEditor}
                                isOutlineOpen={isOutlineOpen}
                                toggleOutline={toggleOutline}
                                isLspLoaded={isLspLoaded}
                                smartLink={smartLink}
                                isAdmin={isAdmin}
                                relink={relink}
                                isFleeting={isFleeting}
                                hasFiles={hasFiles}
                                finalize={finalize}
                                isSaving={isSaving}
                                publish={publish}
                                confirmDelete={confirmDelete}
                                isWritable={isWritable}
                                openUpload={openUpload}
                                find={find}
                                replace={replace}
                                enrich={enrich}
                            />
                        )}
                    </>,
                    navbarActionsEl,
                )}

            <div className='w-full h-full flex flex-col'>
                {/* View content */}
                <div className='flex-1'>
                    {/* Content View */}
                    {activeView === ViewMode.CONTENT && (
                        <div className='w-full h-full overflow-hidden flex flex-col'>
                            <div className='h-full w-full overflow-y-hidden'>
                                {isOutlineOpen ? (
                                    <ResizablePanelGroup
                                        orientation='horizontal'
                                        className='h-full'
                                    >
                                        {/* Editor Panel - conditionally renders Rich or Normal editor */}
                                        <ResizablePanel defaultSize='85%' minSize='50%'>
                                            <div
                                                className={cn(
                                                    'h-full flex flex-col border-r border-border relative',
                                                    !enableEditing &&
                                                        richEditor &&
                                                        'overflow-hidden',
                                                )}
                                            >
                                                {isFindOpen && (
                                                    <FindReplace
                                                        view={findPanelEditorView}
                                                        onClose={() =>
                                                            setIsFindOpen(false)
                                                        }
                                                        initialReplace={isReplaceMode}
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
                                                                files={files}
                                                                setFiles={setFiles}
                                                                source={!richEditor}
                                                                saveNote={save}
                                                                enableEditing={
                                                                    enableEditing
                                                                }
                                                                setLineNumber={
                                                                    setLineNumber
                                                                }
                                                                isSaving={isSaving}
                                                                isDirty={isDirty}
                                                                noteStatus={
                                                                    note?.status
                                                                }
                                                                noteStatusMessage={
                                                                    note?.status_message
                                                                }
                                                                onEditorViewChange={
                                                                    handleEditorViewChange
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
                                                                files={files}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </ResizablePanel>
                                        <ResizableHandle className='w-[2px] border-x border-border hover:bg-primary hover:bg-opacity-50 transition-colors' />
                                        {/* Outline sidebar - right */}
                                        <ResizablePanel
                                            defaultSize='15%'
                                            minSize='10%'
                                            maxSize='30%'
                                        >
                                            <ScrollArea className='h-full'>
                                                <NoteOutline
                                                    data={noteOutline}
                                                    showSeparators={true}
                                                    currentLine={lineNumber}
                                                />
                                            </ScrollArea>
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
                                        {isFindOpen && (
                                            <FindReplace
                                                view={findPanelEditorView}
                                                onClose={() => setIsFindOpen(false)}
                                                initialReplace={isReplaceMode}
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
                                                        files={files}
                                                        setFiles={setFiles}
                                                        source={!richEditor}
                                                        saveNote={save}
                                                        enableEditing={enableEditing}
                                                        setLineNumber={setLineNumber}
                                                        isSaving={isSaving}
                                                        isDirty={isDirty}
                                                        noteStatus={note?.status}
                                                        noteStatusMessage={
                                                            note?.status_message
                                                        }
                                                        onEditorViewChange={
                                                            handleEditorViewChange
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
                                                        files={files}
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
                            files={files || []}
                            copyToClipboard={copyToClipboard}
                        />
                    )}

                    {isAdmin && activeView === ViewMode.HISTORY && noteId && (
                        <div className='py-4 px-4'>
                            <ActivityList contentType='note' objectId={noteId} />
                        </div>
                    )}
                </div>
            </div>
            <EnrichmentRequestDialog
                open={isEnrichOpen}
                onOpenChange={setIsEnrichOpen}
                entitiesList={enrichmentEntities}
                artifactsList={enrichmentArtifacts}
            />
            <ReportGenerationDialog
                open={isReportOpen}
                onOpenChange={setIsReportOpen}
                noteId={noteId}
                noteTitle={note?.title}
            />
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this note? This action is
                            irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={deleteCurrentNote}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <FileUploadDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                files={files}
                onFilesChange={setFiles}
                noteId={noteId}
            />
            {note && (
                <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>About</DialogTitle>
                            <DialogDescription>
                                Note metadata including creation date, author, and edit
                                history.
                            </DialogDescription>
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
