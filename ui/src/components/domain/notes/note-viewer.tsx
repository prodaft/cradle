import FileUploadDialog from '@/components/domain/notes/dialogs/file-upload-dialog';
import RestrictedNote from '@/components/domain/notes/restricted-note';
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
import type { LiveNoteSession, LiveStatus } from '@/utils/editor/sync/live-connection';
import { parseMarkdownInline } from '@/utils/parser';
import { Prec } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
import { BookOpenIcon, InfoIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
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

const CONFLICT_MESSAGE = 'This note was changed by someone else since you loaded it.';
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
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isConflictOpen, setIsConflictOpen] = useState(false);
    const [liveSession, setLiveSession] = useState<LiveNoteSession | null>(null);
    const liveSessionRef = useRef<LiveNoteSession | null>(null);
    const liveUnsentRef = useRef(false);
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
                new Date(note?.updated_at || note?.created_at || new Date()),
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
        [editorUtils, note?.updated_at, note?.created_at],
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
        error: noteError,
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

    const isRestricted = (noteError as { status?: number } | null)?.status === 403;

    const dockPanelTab = useMemo((): DockPanelTabMetadata => {
        if (isError) {
            return {
                title: isRestricted ? 'Restricted note' : 'Not found',
                icon: 'not-found',
            };
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
    }, [isError, isRestricted, note, noteData]);
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
    const wasEditableFleetingRef = useRef(false);

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
        const isEditableFleeting = nextIsFleeting && nextCanWrite;
        const becameEditableFleeting =
            isEditableFleeting && !wasEditableFleetingRef.current;
        wasEditableFleetingRef.current = isEditableFleeting;
        if (switchedNote) {
            setEnableEditing(isEditableFleeting);
        } else if (!nextCanWrite && enableEditingRef.current) {
            setEnableEditing(false);
        } else if (becameEditableFleeting && !enableEditingRef.current) {
            setEnableEditing(true);
        }

        const { markdownContent: md, initialMarkdown: init } = editorDraftRef.current;
        const applyServerBody =
            switchedNote ||
            (!liveSessionRef.current && md === init && noteData.content !== md);

        if (switchedNote) {
            setSaveError(null);
            setIsConflictOpen(false);
        }

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

    const saveNow = useCallback(() => {
        liveSessionRef.current?.saveNow();
    }, []);

    useEffect(() => {
        liveSessionRef.current = liveSession;
        if (!liveSession) return;

        let previous = liveSession.getStatus().saveState;
        let lostAccess = false;
        const apply = ({
            saveState,
            message,
            dirty,
            accessLost,
            unsent,
        }: LiveStatus) => {
            liveUnsentRef.current = unsent;
            if (accessLost && !lostAccess) {
                lostAccess = true;
                toast.error('You can no longer edit this note.');
                queryClient.invalidateQueries({
                    queryKey: queryKeys.notes.apiDetail(noteId),
                });
            }
            setIsDirty(dirty);
            setIsSaving(saveState === 'saving');
            setSaveError(
                saveState === 'conflict'
                    ? CONFLICT_MESSAGE
                    : saveState === 'error'
                      ? message || 'The note could not be saved.'
                      : null,
            );
            if (saveState === 'conflict' && previous !== 'conflict')
                setIsConflictOpen(true);
            if (saveState === 'saved' && previous !== 'saved') {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.notes.apiDetail(noteId),
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.notes.apiList() });
            }
            previous = saveState;
        };
        apply(liveSession.getStatus());
        const unsubscribe = liveSession.subscribe(apply);
        return () => {
            unsubscribe();
            setIsSaving(false);
            setIsDirty(false);
            setSaveError(null);
            if (!liveUnsentRef.current) {
                setInitialMarkdown(editorDraftRef.current.markdownContent);
                return;
            }
            // The session ended before the server got the latest edits, so they're lost:
            // show the saved note again rather than text that will never be saved.
            liveUnsentRef.current = false;
            toast.warning('Your latest changes to this note could not be saved.');
            const saved = queryClient.getQueryData<NoteRetrieve>(
                queryKeys.notes.apiDetail(noteId),
            )?.content;
            if (saved !== undefined) {
                setMarkdownContent(saved);
                setInitialMarkdown(saved);
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.notes.apiDetail(noteId),
            });
        };
    }, [liveSession, noteId, queryClient]);

    const openSaveError = useCallback(() => {
        if (saveError === CONFLICT_MESSAGE) setIsConflictOpen(true);
        else saveNow();
    }, [saveError, saveNow]);

    const overwriteWithMine = useCallback(() => {
        liveSessionRef.current?.resolveConflict('mine');
    }, []);

    const loadLatest = useCallback(() => {
        liveSessionRef.current?.resolveConflict('theirs');
    }, []);

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
                        saveNow();
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
    }, [find, replace, saveNow, isWritable]);

    useEffect(() => {
        if (!isDirty && !isSaving) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty, isSaving]);

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
        if (isRestricted) return <RestrictedNote noteId={noteId} />;
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
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => setIsAboutOpen(true)}
                                            className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                                            data-testid='about-note-btn'
                                        />
                                    }
                                >
                                    <InfoIcon size={20} weight='bold' />
                                </TooltipTrigger>
                                <TooltipContent>About</TooltipContent>
                            </Tooltip>
                        )}
                        {isWritable && (
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => toggleEditing()}
                                            className='p-2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground'
                                            data-testid='edit-mode-toggle-btn'
                                        />
                                    }
                                >
                                    {enableEditing ? (
                                        <PencilSimpleIcon size={20} weight='bold' />
                                    ) : (
                                        <BookOpenIcon size={20} weight='bold' />
                                    )}
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
                                                                saveNote={saveNow}
                                                                enableEditing={
                                                                    enableEditing
                                                                }
                                                                setLineNumber={
                                                                    setLineNumber
                                                                }
                                                                isSaving={isSaving}
                                                                isDirty={isDirty}
                                                                saveError={saveError}
                                                                onSaveErrorClick={
                                                                    openSaveError
                                                                }
                                                                onLiveSessionChange={
                                                                    setLiveSession
                                                                }
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
                                                        saveNote={saveNow}
                                                        enableEditing={enableEditing}
                                                        setLineNumber={setLineNumber}
                                                        isSaving={isSaving}
                                                        isDirty={isDirty}
                                                        saveError={saveError}
                                                        onSaveErrorClick={openSaveError}
                                                        onLiveSessionChange={
                                                            setLiveSession
                                                        }
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

                    {activeView === ViewMode.HISTORY && noteId && (
                        <div className='py-4 px-4'>
                            <ActivityList noteId={noteId} />
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
            <AlertDialog open={isConflictOpen} onOpenChange={setIsConflictOpen}>
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            This note was changed elsewhere
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Someone else saved this note after you opened it, so your
                            latest edits have not been saved. Autosave is paused until
                            you choose which version to keep.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Decide later
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='outline'
                            size='sm'
                            onClick={loadLatest}
                        >
                            Discard mine and load theirs
                        </AlertDialogAction>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={overwriteWithMine}
                        >
                            Overwrite with mine
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                                            note.created_at
                                                ? format(
                                                      new Date(note.created_at),
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
                                                    note.updated_at
                                                        ? format(
                                                              new Date(note.updated_at),
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
                                {note.linked_at && (
                                    <Field>
                                        <FieldLabel htmlFor='about-last-linked'>
                                            Last linked
                                        </FieldLabel>
                                        <Input
                                            id='about-last-linked'
                                            readOnly
                                            className='text-muted-foreground bg-muted/50'
                                            value={format(
                                                new Date(note.linked_at),
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
