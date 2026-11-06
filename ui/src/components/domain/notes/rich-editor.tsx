import { useOpenExternalLink } from '@/components/base/external-link-confirm/external-link-confirm';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { useNdjsonQuery } from '@/hooks/query';
import { CradleEditor } from '@/utils/editor/enhancements';
import {
    cradleLinkColorPlugin,
    cradleLinksPlugin,
    headingGutterLineClass,
    headingLineClassPlugin,
    hoveredGutterLineClass,
} from '@/utils/editor/link-plugin';
import {
    highlightNoteIssues,
    locateNoteIssues,
    noteIssueHighlight,
} from '@/utils/editor/note-issues';
import { revealAfterPointerSelection } from '@/utils/editor/plugin-decoration-utils';
import {
    referenceLinksPlugin,
    referenceLinkSyntax,
} from '@/utils/editor/reference-links';
import { renderedCopy } from '@/utils/editor/rendered-copy';
import { codemirrorEditorSyncPeerExtensions } from '@/utils/editor/sync/codemirror-peer';
import {
    connectLiveNote,
    type LiveEditorSyncConnection,
    type LiveNoteSession,
    type LiveStatus,
} from '@/utils/editor/sync/live-connection';
import { ReconnectTimer } from '@/utils/editor/sync/reconnect-timer';
import {
    type LivePeer,
    remoteCursorExtensions,
} from '@/utils/editor/sync/remote-cursors';
import { tablePlugin } from '@/utils/editor/table-plugin';
import { handleLinkClick } from '@/utils/editor/text-editor';
import { createCradleTheme } from '@/utils/editor/theme';
import { titleLineExtension } from '@/utils/editor/title-line';
import { logger } from '@/utils/logger';
import {
    acceptCompletion,
    autocompletion,
    closeBrackets,
    completionKeymap,
} from '@codemirror/autocomplete';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import {
    HighlightStyle,
    indentOnInput,
    syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import {
    EditorState,
    Extension,
    Prec,
    StateEffect,
    Transaction,
} from '@codemirror/state';
import {
    drawSelection,
    EditorView,
    highlightActiveLine,
    keymap,
    lineNumbers,
    rectangularSelection,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import {
    additionalMarkdownSyntaxTags,
    baseSyntaxHighlights,
    clickLinkHandler,
    defaultClickLinkHandler,
    markdownTags,
    prosemarkBaseThemeSetup,
    prosemarkBasicSetup,
    prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { CodeMirror, getCM, vim, Vim } from '@replit/codemirror-vim';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { type ConnectionNotice, ConnectionToast } from './connection-toast';
import {
    countText,
    EditorStatusBar,
    formatNoteStatusLabel,
    type TextCounts,
    type VimMode,
} from './editor-status-bar';
import { getSaveStatus } from './status-indicators';

type FileDownload = components['schemas']['FileDownload'];
type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];
type NoteProcessingStatus = components['schemas']['NoteRetrieve']['status'];
type NoteStatusIssue = components['schemas']['NoteStatusIssue'];

const NO_NOTE_ISSUES: NoteStatusIssue[] = [];

// Vim instances whose mode changes already feed the status bar.
const vimModeListeners = new WeakSet<CodeMirror>();

interface RichEditorProps {
    noteid: string;
    markdownContent: string;
    setMarkdownContent: (content: string) => void;
    files: FileReferenceWithNote[];
    /** Uploads files pasted or dropped into the editor. */
    onUploadFiles?: (files: File[]) => void;
    saveNote: () => void;
    additionalExtensions?: Extension[];
    enableEditing?: boolean;
    source?: boolean;
    setLineNumber: (lineNumber: number) => void;
    editorUtils: CradleEditor;
    referenceMappings?: Record<string, FileReferenceWithNote>;
    isSaving?: boolean;
    isDirty?: boolean;
    saveError?: string | null;
    onSaveErrorClick?: () => void;
    onLiveSessionChange?: (session: LiveNoteSession | null) => void;
    onLiveUsersChange?: (users: LivePeer[]) => void;
    noteStatus?: NoteProcessingStatus;
    noteStatusMessage?: string | null;
    noteStatusIssues?: NoteStatusIssue[];
    onEditorViewChange?: (view: EditorView | null) => void;
}

interface RichEditorRef {
    view: EditorView | null;
}

// Editing pauses once an edit has gone this long without the server accepting it, so
// a long outage can't pile up unbounded unsaved work; it resumes once they're accepted.
const MAX_UNSENT_MS = 120_000;

const sourceModeSyntaxHighlighting = syntaxHighlighting(
    HighlightStyle.define([
        { tag: markdownTags.headerMark, color: 'var(--pm-header-mark-color)' },
        { tag: markdownTags.listMark, color: 'var(--pm-header-mark-color)' },
        { tag: tags.strong, fontWeight: 'bold' },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through' },
        { tag: tags.meta, color: 'var(--pm-muted-color)' },
        { tag: tags.comment, color: 'var(--pm-syntax-comment)' },
        { tag: markdownTags.escapeMark, color: 'var(--pm-muted-color)' },
        { tag: tags.monospace, color: 'var(--pm-syntax-keyword)' },
        {
            tag: markdownTags.linkURL,
            color: 'var(--pm-link-color)',
            textDecoration: 'underline',
        },
        { tag: tags.link, color: 'var(--pm-syntax-link)' },
        { tag: tags.keyword, color: 'var(--pm-syntax-keyword)' },
        {
            tag: [
                tags.atom,
                tags.bool,
                tags.url,
                tags.contentSeparator,
                tags.labelName,
            ],
            color: 'var(--pm-syntax-atom)',
        },
        { tag: [tags.literal, tags.inserted], color: 'var(--pm-syntax-literal)' },
        { tag: [tags.string, tags.deleted], color: 'var(--pm-syntax-string)' },
        {
            tag: [tags.regexp, tags.escape, tags.special(tags.string)],
            color: 'var(--pm-syntax-regexp)',
        },
        {
            tag: tags.definition(tags.variableName),
            color: 'var(--pm-syntax-definition-variable)',
        },
        {
            tag: tags.local(tags.variableName),
            color: 'var(--pm-syntax-local-variable)',
        },
        {
            tag: [tags.typeName, tags.namespace],
            color: 'var(--pm-syntax-type-namespace)',
        },
        { tag: tags.className, color: 'var(--pm-syntax-class-name)' },
        {
            tag: [tags.special(tags.variableName), tags.macroName],
            color: 'var(--pm-syntax-special-variable-macro)',
        },
        {
            tag: tags.definition(tags.propertyName),
            color: 'var(--pm-syntax-definition-property)',
        },
        { tag: tags.invalid, color: 'var(--pm-syntax-invalid)' },
    ]),
);

const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(function RichEditor(
    {
        noteid,
        markdownContent,
        setMarkdownContent,
        files,
        onUploadFiles,
        saveNote,
        additionalExtensions = [],
        enableEditing = true,
        source = false,
        editorUtils,
        setLineNumber,
        referenceMappings: propReferenceMappings,
        isSaving = false,
        isDirty = false,
        saveError = null,
        onSaveErrorClick,
        onLiveSessionChange,
        onLiveUsersChange,
        noteStatus,
        noteStatusMessage,
        noteStatusIssues = NO_NOTE_ISSUES,
        onEditorViewChange,
    },
    ref,
) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [selectionCounts, setSelectionCounts] = useState<TextCounts | null>(null);
    const [vimMode, setVimMode] = useState<VimMode>('normal');
    const { isLoggedIn } = useAuthActions();
    const { data: profile } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: 'me' } } },
        { enabled: isLoggedIn(), meta: { showErrorToast: false } },
    );
    const isDarkMode = useTheme().resolvedTheme === 'dark';
    const router = useRouter();
    const openExternalLink = useOpenExternalLink();
    const routerRef = useRef(router);
    routerRef.current = router;
    const onEditorViewChangeRef = useRef(onEditorViewChange);
    onEditorViewChangeRef.current = onEditorViewChange;
    const navigate = useCallback((url: string) => {
        const dashboardMatch = url.match(/^\/dashboards\/([^/]+)\/([^/]+)\/?$/);
        if (dashboardMatch) {
            const subtype = dashboardMatch[1];
            const name = dashboardMatch[2];
            if (subtype !== undefined && name !== undefined) {
                routerRef.current.navigate({
                    to: '/dashboards/$subtype/$name',
                    params: {
                        subtype: decodeURIComponent(subtype),
                        name: decodeURIComponent(name),
                    },
                });
                return;
            }
        }
        routerRef.current.navigate({ to: url as any });
    }, []);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const setMarkdownContentRef = useRef(setMarkdownContent);
    const saveNoteRef = useRef(saveNote);
    const setLineNumberRef = useRef(setLineNumber);
    const onUploadFilesRef = useRef(onUploadFiles);
    const prevNoteIdRef = useRef(noteid);
    const editorSyncInitDocRef = useRef('');
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());

    const onLiveSessionChangeRef = useRef(onLiveSessionChange);
    onLiveSessionChangeRef.current = onLiveSessionChange;
    const [editorSyncEpoch, setEditorSyncEpoch] = useState(0);
    const [livePeers, setLivePeers] = useState<LivePeer[]>([]);
    const [liveUnavailable, setLiveUnavailable] = useState(false);
    const [liveConnected, setLiveConnected] = useState(true);
    const [liveRetryAt, setLiveRetryAt] = useState<number | null>(null);
    const [liveRetry] = useState(() => {
        const retry = new ReconnectTimer(
            () => setEditorSyncEpoch((epoch) => epoch + 1),
            () => setLiveRetryAt(retry.at),
        );
        return retry;
    });
    const [liveReconnectAt, setLiveReconnectAt] = useState<number | null>(null);
    const [editingPaused, setEditingPaused] = useState(false);
    const toastKey = useId();
    const liveUsers = useMemo(
        () => [...new Map(livePeers.map((p) => [p.username, p])).values()],
        [livePeers],
    );
    useEffect(() => {
        onLiveUsersChange?.(liveUsers);
        return () => onLiveUsersChange?.([]);
    }, [liveUsers, onLiveUsersChange]);

    const needsEditorSyncHydration = Boolean(noteid) && enableEditing;
    const [editorSyncHydrated, setEditorSyncHydrated] = useState(
        !needsEditorSyncHydration,
    );
    const [editorSyncSession, setEditorSyncSession] = useState<{
        noteid: string;
        startVersion: number;
        connection: LiveEditorSyncConnection;
    } | null>(null);

    useLayoutEffect(() => {
        setEditorSyncSession((prev) => {
            prev?.connection.close();
            return null;
        });
        if (needsEditorSyncHydration) setEditorSyncHydrated(false);
        else setEditorSyncHydrated(true);
    }, [noteid, needsEditorSyncHydration, editorSyncEpoch]);

    useEffect(() => {
        let cancelled = false;
        if (!needsEditorSyncHydration) {
            setEditorSyncHydrated(true);
            setLiveUnavailable(false);
            return () => {
                cancelled = true;
            };
        }
        let conn: LiveEditorSyncConnection | null = null;
        let stopResetListener: (() => void) | undefined;
        const unavailable = () => {
            setLiveUnavailable(true);
            setEditorSyncHydrated(true);
            liveRetry.schedule();
        };
        void (async () => {
            const live = await connectLiveNote(noteid);
            if (cancelled) {
                live?.close();
                return;
            }
            if (!live) {
                unavailable();
                return;
            }
            conn = live;
            try {
                const { version, doc } = await conn.getDocument();
                if (cancelled) return;
                editorSyncInitDocRef.current = doc;
                const view = editorViewRef.current;
                if (view && view.state.doc.toString() !== doc) {
                    view.dispatch({
                        changes: { from: 0, to: view.state.doc.length, insert: doc },
                        annotations: Transaction.addToHistory.of(false),
                    });
                }
                setEditorSyncSession({
                    noteid,
                    startVersion: version,
                    connection: conn,
                });
                if (doc !== (markdownContentRef.current ?? '')) {
                    setMarkdownContentRef.current(doc);
                }
                stopResetListener = live.live.onReset(() =>
                    setEditorSyncEpoch((epoch) => epoch + 1),
                );
                onLiveSessionChangeRef.current?.(live.live);
                liveRetry.resetBackoff();
                setLiveUnavailable(false);
                setEditorSyncHydrated(true);
            } catch {
                conn.close();
                conn = null;
                if (!cancelled) unavailable();
            }
        })();
        return () => {
            cancelled = true;
            liveRetry.cancel();
            stopResetListener?.();
            if (conn) onLiveSessionChangeRef.current?.(null);
            conn?.close();
        };
    }, [needsEditorSyncHydration, noteid, editorSyncEpoch, liveRetry]);

    useEffect(() => {
        liveRetry.resetBackoff();
    }, [liveRetry, noteid]);

    const syncExtensions = useMemo(() => {
        if (!editorSyncSession || editorSyncSession.noteid !== noteid) return [];
        const { connection, startVersion } = editorSyncSession;
        const { live } = connection;
        return [
            ...codemirrorEditorSyncPeerExtensions(startVersion, connection),
            ...remoteCursorExtensions(live, setLivePeers),
        ];
    }, [editorSyncSession, noteid]);

    const liveSession =
        editorSyncSession?.noteid === noteid ? editorSyncSession.connection.live : null;
    const canEdit =
        enableEditing &&
        (!needsEditorSyncHydration || (!!liveSession && !editingPaused));

    useEffect(() => {
        setLiveConnected(true);
        setEditingPaused(false);
        if (!liveSession) return;
        let since: number | null = null;
        let pauseTimer: ReturnType<typeof setTimeout> | undefined;
        const apply = ({ connected, reconnectAt, unsentSince }: LiveStatus) => {
            setLiveConnected(connected);
            setLiveReconnectAt(reconnectAt);
            if (unsentSince === since) return;
            since = unsentSince;
            clearTimeout(pauseTimer);
            setEditingPaused(false);
            if (unsentSince === null) return;
            pauseTimer = setTimeout(
                () => setEditingPaused(true),
                Math.max(0, unsentSince + MAX_UNSENT_MS - Date.now()),
            );
        };
        apply(liveSession.getStatus());
        const unsubscribe = liveSession.subscribe(apply);
        return () => {
            unsubscribe();
            clearTimeout(pauseTimer);
        };
    }, [liveSession]);

    const onUpdate = useMemo(
        () =>
            EditorView.updateListener.of((u) => {
                if (u.docChanged) setMarkdownContentRef.current(u.state.doc.toString());
                if (u.docChanged || u.selectionSet) {
                    const sel = u.state.selection.main;
                    const next = sel.empty
                        ? null
                        : countText(u.state.sliceDoc(sel.from, sel.to));
                    setSelectionCounts((prev) =>
                        prev?.words === next?.words && prev?.chars === next?.chars
                            ? prev
                            : next,
                    );
                }
                const cm = getCM(u.view);
                if (cm && !vimModeListeners.has(cm)) {
                    vimModeListeners.add(cm);
                    setVimMode('normal');
                    cm.on('vim-mode-change', (e: { mode: VimMode }) =>
                        setVimMode(e.mode),
                    );
                }
                const line = u.state.doc.lineAt(u.state.selection.main.head).number;
                setLineNumberRef.current(line);
            }),
        [],
    );

    const downloadFile = useMutation({
        mutationFn: async (fileId: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/files/{file_id}/download/',
                {
                    params: {
                        path: {
                            file_id: fileId,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return {
                presigned_url: data!.presigned_url,
                expires_at: data!.expires_at,
            } satisfies FileDownload;
        },
        meta: {
            suppressNotification: true,
        },
    });

    const { data: entryClasses } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        refetchOnWindowFocus: false,
        meta: { showErrorToast: false, suppressNotification: true },
    });

    useEffect(() => {
        if (entryClasses == null) return;
        const results = entryClasses;
        const map = new Map<string, string>();
        for (const entry of results) {
            if (entry.color) {
                map.set(entry.subtype, entry.color);
            }
        }
        setEntryColors((prev) => {
            if (
                prev.size !== map.size ||
                [...prev.entries()].some(([k, v]) => map.get(k) !== v) ||
                [...map.entries()].some(([k, v]) => prev.get(k) !== v)
            )
                return map;
            return prev;
        });
    }, [entryClasses]);

    const downloadMutateRef = useRef(downloadFile.mutateAsync);
    downloadMutateRef.current = downloadFile.mutateAsync;

    const fileDownloadFn = useCallback(
        async (file: { fileId: string }): Promise<FileDownload> => {
            return await downloadMutateRef.current(file.fileId);
        },
        [],
    );

    const cradleTheme = useMemo(() => createCradleTheme(isDarkMode), [isDarkMode]);

    useImperativeHandle(
        ref,
        () => ({
            get view() {
                return editorViewRef.current;
            },
        }),
        [],
    );

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        setMarkdownContentRef.current = setMarkdownContent;
        saveNoteRef.current = saveNote;
        setLineNumberRef.current = setLineNumber;
        onUploadFilesRef.current = onUploadFiles;
    }, [setMarkdownContent, saveNote, setLineNumber, onUploadFiles]);

    const codeBlockCopyExtension = useMemo(() => {
        return EditorView.domEventHandlers({
            click: (event) => {
                const target = event.target;
                if (
                    target instanceof HTMLElement &&
                    target.classList.contains('code-block-copy-btn')
                ) {
                    const codeBlock = target.closest('pre');
                    if (codeBlock) {
                        const code = codeBlock.textContent || '';
                        const originalText = target.innerText;
                        target.innerText = 'Copied!';
                        setTimeout(() => {
                            target.innerText = originalText;
                        }, 900);
                        navigator.clipboard
                            .writeText(code)
                            .catch(() =>
                                toast.error(
                                    'Copy failed. Check permissions or try again.',
                                ),
                            );
                    }
                    return true;
                }
                return false;
            },
        });
    }, []);

    const fileUploadInteractionHandler = useMemo(() => {
        return Prec.high(
            EditorView.domEventHandlers({
                paste: (event, view) => {
                    if (view.state.readOnly || !onUploadFilesRef.current) return false;
                    const items = event.clipboardData?.items;
                    if (!items) return false;

                    const pastedFiles: File[] = [];
                    let hasText = false;
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (!item) continue;
                        if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (file) pastedFiles.push(file);
                        } else if (
                            item.kind === 'string' &&
                            (item.type === 'text/plain' || item.type === 'text/html')
                        ) {
                            hasText = true;
                        }
                    }

                    if (pastedFiles.length > 0 && !hasText) {
                        event.preventDefault();
                        onUploadFilesRef.current(pastedFiles);
                        return true;
                    }
                    return false;
                },
                dragover: (event, view) => {
                    if (view.state.readOnly || !onUploadFilesRef.current) return false;
                    const types = event.dataTransfer?.types;
                    if (!types) return false;

                    const includesFiles = Array.from(types).some(
                        (type) => type === 'Files' || type === 'application/x-moz-file',
                    );
                    if (!includesFiles) return false;

                    event.preventDefault();
                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'copy';
                    }
                    return true;
                },
                drop: (event, view) => {
                    if (view.state.readOnly || !onUploadFilesRef.current) return false;
                    const droppedFiles = Array.from(event.dataTransfer?.files ?? []);
                    if (droppedFiles.length === 0) return false;

                    event.preventDefault();
                    onUploadFilesRef.current(droppedFiles);
                    return true;
                },
            }),
        );
    }, []);

    const referenceMappings = useMemo(() => {
        if (propReferenceMappings) return propReferenceMappings;
        const mappings: Record<string, FileReferenceWithNote> = {};
        for (const file of files) {
            if (file.id) mappings[file.id] = file;
            mappings[`${file.id}-${file.name}`] = file;
        }
        return mappings;
    }, [files, propReferenceMappings]);

    const languageExtension = useMemo(
        () =>
            yamlFrontmatter({
                content: markdown({
                    codeLanguages: languages,
                    extensions: [
                        GFM,
                        CradleEditor.extension(),
                        referenceLinkSyntax(referenceMappings || {}),
                        ...(source
                            ? [additionalMarkdownSyntaxTags]
                            : [prosemarkMarkdownSyntaxExtensions]),
                    ],
                }),
            }),
        [referenceMappings, source],
    );

    const extensions = useMemo(() => {
        const onLinkClick = handleLinkClick(navigate, openExternalLink);
        let exts: Extension[] = [
            cradleLinksPlugin(entryColors, navigate, source),
            cradleLinkColorPlugin(entryColors, source),
            headingLineClassPlugin(source),
            referenceLinksPlugin(referenceMappings, fileDownloadFn, source),
            tablePlugin(entryColors, navigate, source),
            noteIssueHighlight,
            languageExtension,
            ...(!source
                ? [
                      (prosemarkBasicSetup() as Extension[]).filter(
                          (ext) => ext !== defaultClickLinkHandler,
                      ),
                      prosemarkBaseThemeSetup(),
                      htmlBlockExtension,
                      codeBlockCopyExtension,
                      renderedCopy,
                      revealAfterPointerSelection,
                      titleLineExtension,
                      clickLinkHandler.of(openExternalLink),
                      EditorView.domEventHandlers({
                          click: onLinkClick,
                          auxclick: onLinkClick,
                      }),
                      baseSyntaxHighlights,
                  ]
                : [sourceModeSyntaxHighlighting]),
            fileUploadInteractionHandler,
            Prec.high(cradleTheme),
            EditorView.lineWrapping,
            history(),
            search({ top: true }),
            highlightSelectionMatches(),
            drawSelection(),
            rectangularSelection(),
            ...(canEdit ? [highlightActiveLine()] : []),
            indentOnInput(),
            closeBrackets(),
            Prec.highest(
                keymap.of([
                    ...(completionKeymap as any),
                    { key: 'Tab', run: acceptCompletion },
                ] as any) as any,
            ),
            keymap.of([
                indentWithTab,
                ...(defaultKeymap as any),
                ...(historyKeymap as any),
                ...(searchKeymap as any),
            ] as any) as any,
            EditorState.readOnly.of(!canEdit),
            EditorView.editable.of(canEdit),
            onUpdate,
            keymap.of([
                {
                    key: 'Mod-s',
                    run: (cm: EditorView) => {
                        if (!canEdit) return false;
                        setMarkdownContentRef.current(cm.state.doc.toString());
                        saveNoteRef.current();
                        return true;
                    },
                },
            ]),
            autocompletion({ interactionDelay: 0 }),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            EditorView.theme({
                '&': { height: '100%' },
                '.cm-scroller': { overflow: 'auto' },
            }),
            ...additionalExtensions,
            ...syncExtensions,
        ];

        if (source) {
            exts.push(lineNumbers());
        } else {
            // Only the fold gutter is present here; drop the source-mode gutter chrome
            // from cradleTheme (Prec.high) so it reads like prosemark's.
            exts.push(
                headingGutterLineClass,
                hoveredGutterLineClass,
                Prec.highest(
                    EditorView.theme({
                        '.cm-gutters': {
                            backgroundColor: 'transparent',
                            borderRight: 'none',
                        },
                        // Rows take the line's font size (headings via
                        // headingGutterLineClass), so a 1lh-tall marker centers on
                        // the line's first visual row, including wrapped lines.
                        // paddingLeft mirrors .cm-line's 6px left padding so the
                        // chevron is centered between the editor edge and the text.
                        '.cm-foldGutter .cm-gutterElement': {
                            fontSize: '0.9rem',
                            paddingLeft: '6px',
                            cursor: 'pointer',
                        },
                        '.cm-foldGutter .cm-gutter-heading-1': { fontSize: '1.44rem' },
                        '.cm-foldGutter .cm-gutter-heading-2': { fontSize: '1.26rem' },
                        '.cm-foldGutter .cm-gutter-heading-3': { fontSize: '1.08rem' },
                        // The text glyphs (⌄ ›) sit off-center in their box, so they
                        // are hidden and a centered chevron is drawn instead.
                        '.cm-foldGutter .cm-gutterElement > span': {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '1lh',
                            padding: '0',
                            color: 'transparent',
                            position: 'relative',
                        },
                        '.cm-foldGutter .cm-gutterElement > span::before': {
                            content: '""',
                            position: 'absolute',
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'var(--muted-foreground)',
                            mask: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E") center / contain no-repeat`,
                            // Shown only on the hovered line (hoveredGutterLineClass)
                            // or when folded, so a fold can always be found again.
                            opacity: '0',
                        },
                        '.cm-foldGutter .cm-gutterElement.cm-gutter-hovered > span::before':
                            { opacity: '1' },
                        '.cm-foldGutter .cm-gutterElement:hover > span::before': {
                            backgroundColor: 'var(--foreground)',
                        },
                        '.cm-foldGutter .cm-gutterElement > span[title="Unfold line"]::before':
                            { transform: 'rotate(-90deg)', opacity: '1' },
                        '.cm-content': { padding: '1rem 1rem 1rem 0' },
                    }),
                ),
            );
        }

        if (profile?.vim_mode) {
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        languageExtension,
        profile?.vim_mode,
        additionalExtensions,
        entryColors,
        source,
        canEdit,
        cradleTheme,
        codeBlockCopyExtension,
        fileUploadInteractionHandler,
        referenceMappings,
        navigate,
        openExternalLink,
        fileDownloadFn,
        onUpdate,
        syncExtensions,
    ]);

    useEffect(() => {
        if (profile?.vim_mode) {
            Vim.defineEx('write', 'w', (cm: CodeMirror) => {
                try {
                    setMarkdownContentRef.current(cm.cm6.state.doc.toString());
                    saveNoteRef.current();
                } catch (error) {
                    toast.error('Failed to save note. Please try again with Ctrl-S.');
                    logger.error('Save via Vim :w failed', error);
                }
                return true;
            });
        }
    }, [profile?.vim_mode]);

    useEffect(() => {
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                effects: [StateEffect.reconfigure.of(extensions)],
            });
        }
    }, [extensions]);

    useEffect(() => {
        if (prevNoteIdRef.current !== noteid) {
            if (editorViewRef.current) {
                onEditorViewChangeRef.current?.(null);
                editorViewRef.current.destroy();
                editorViewRef.current = null;
                setIsEditorReady(false);
                setSelectionCounts(null);
                setVimMode('normal');
            }
            prevNoteIdRef.current = noteid;
        }
    }, [noteid]);

    useEffect(() => {
        if (!editorViewRef.current && editorRef.current && extensions.length > 0) {
            if (needsEditorSyncHydration && !editorSyncHydrated) return;
            try {
                const initialDoc =
                    editorSyncSession && editorSyncSession.noteid === noteid
                        ? editorSyncInitDocRef.current
                        : markdownContent;
                logger.debug('Editor init', {
                    noteId: noteid,
                    initialDocLength: initialDoc.length,
                    extensionsCount: extensions.length,
                });
                const state = EditorState.create({
                    doc: initialDoc,
                    extensions,
                });

                const view = new EditorView({
                    state,
                    parent: editorRef.current,
                });

                editorViewRef.current = view;
                onEditorViewChangeRef.current?.(view);
                setIsEditorReady(true);
            } catch (error) {
                logger.error('Editor init failed', error);
                toast.error(
                    `Failed to initialize editor: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
                );
            }
        }
    }, [
        noteid,
        markdownContent,
        extensions,
        editorSyncHydrated,
        needsEditorSyncHydration,
        editorSyncSession,
    ]);

    useEffect(() => {
        return () => {
            if (editorViewRef.current) {
                onEditorViewChangeRef.current?.(null);
                editorViewRef.current.destroy();
                editorViewRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;
        if (editorSyncSession && editorSyncSession.noteid === noteid) return;

        const currentContent = view.state.doc.toString();
        if (currentContent === markdownContent) return;

        const cursorPos = view.state.selection.main.head;
        const nextCursorPos = Math.min(cursorPos, markdownContent.length);

        view.dispatch({
            changes: {
                from: 0,
                to: currentContent.length,
                insert: markdownContent,
            },
            selection: { anchor: nextCursorPos, head: nextCursorPos },
        });
    }, [markdownContent, editorSyncSession, noteid]);

    useEffect(() => {
        if (!isEditorReady) return;
        const view = editorViewRef.current;
        if (!view) return;

        const updateLabels = () => {
            const panel = view.dom.querySelector('.cm-search');
            if (!panel) return;

            const labelMap: Record<string, string> = {
                'match case': 'Match Case',
                'by word': 'Match Whole Word',
                regexp: 'Use Regular Expression',
            };

            panel.querySelectorAll('label').forEach((label) => {
                const textNode = Array.from(label.childNodes).find(
                    (node) =>
                        node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
                );
                if (textNode) {
                    const newText = labelMap[textNode.textContent?.trim() || ''];
                    if (newText) textNode.textContent = newText;
                }
            });
        };

        const observer = new MutationObserver(() => {
            if (view.dom.querySelector('.cm-search')) {
                requestAnimationFrame(updateLabels);
            }
        });

        observer.observe(view.dom, { childList: true, subtree: true });
        requestAnimationFrame(updateLabels);

        return () => observer.disconnect();
    }, [isEditorReady]);

    const counts = useMemo(() => countText(markdownContent), [markdownContent]);
    const noteIssueRows = useMemo(
        () => locateNoteIssues(markdownContent, noteStatusIssues),
        [markdownContent, noteStatusIssues],
    );
    useEffect(() => {
        const view = editorViewRef.current;
        if (view && isEditorReady) highlightNoteIssues(view, noteIssueRows);
    }, [noteIssueRows, isEditorReady]);
    const jumpToNoteIssue = useCallback((pos: number) => {
        const view = editorViewRef.current;
        if (!view) return;
        if (pos > view.state.doc.length) return;
        view.dispatch({
            selection: { anchor: pos },
            effects: EditorView.scrollIntoView(pos, { y: 'center' }),
        });
        view.focus();
    }, []);
    const saveStatus = getSaveStatus(markdownContent, isSaving, isDirty, !!saveError);

    const noteStatusBadgeDescription =
        noteStatusMessage?.trim() ||
        (noteStatus
            ? `Note status: ${formatNoteStatusLabel(noteStatus)}`
            : 'Note status unavailable');

    const connectionNotice: ConnectionNotice | null =
        needsEditorSyncHydration && liveUnavailable
            ? 'unreachable'
            : !liveSession
              ? null
              : editingPaused
                ? 'paused'
                : !liveConnected
                  ? 'offline'
                  : null;

    const retryLiveNow = useCallback(() => liveRetry.retrySoon(), [liveRetry]);
    const reconnect =
        needsEditorSyncHydration && liveUnavailable
            ? { at: liveRetryAt, now: retryLiveNow }
            : liveSession && !liveConnected
              ? { at: liveReconnectAt, now: liveSession.reconnectNow }
              : null;

    return (
        <div className='h-full w-full flex flex-col overflow-hidden'>
            <ConnectionToast
                id={`live-connection-${toastKey}`}
                notice={connectionNotice}
                reconnect={reconnect}
            />
            <div className='flex-1 min-h-0 relative'>
                <div
                    id='codemirror-container'
                    ref={editorRef}
                    className='absolute inset-0 rich-editor markdown-body'
                    role='textbox'
                    aria-label='Rich text editor'
                    aria-multiline='true'
                    tabIndex={0}
                />
            </div>

            <EditorStatusBar
                counts={counts}
                selection={selectionCounts}
                vimMode={profile?.vim_mode ? vimMode : null}
                liveStatus={connectionNotice ?? (liveSession ? 'live' : null)}
                saveStatus={saveStatus}
                saveError={saveError}
                onSaveErrorClick={onSaveErrorClick}
                noteStatus={noteStatus}
                noteStatusDescription={noteStatusBadgeDescription}
                noteStatusIssues={noteIssueRows}
                onNoteIssueSelect={jumpToNoteIssue}
            />
        </div>
    );
});

export default memo(RichEditor, (prevProps, nextProps) => {
    return (
        prevProps.noteid === nextProps.noteid &&
        prevProps.markdownContent === nextProps.markdownContent &&
        prevProps.files === nextProps.files &&
        prevProps.additionalExtensions === nextProps.additionalExtensions &&
        prevProps.source === nextProps.source &&
        prevProps.enableEditing === nextProps.enableEditing &&
        prevProps.editorUtils === nextProps.editorUtils &&
        prevProps.onUploadFiles === nextProps.onUploadFiles &&
        prevProps.setMarkdownContent === nextProps.setMarkdownContent &&
        prevProps.saveNote === nextProps.saveNote &&
        prevProps.setLineNumber === nextProps.setLineNumber &&
        prevProps.referenceMappings === nextProps.referenceMappings &&
        prevProps.isSaving === nextProps.isSaving &&
        prevProps.isDirty === nextProps.isDirty &&
        prevProps.saveError === nextProps.saveError &&
        prevProps.onSaveErrorClick === nextProps.onSaveErrorClick &&
        prevProps.onLiveSessionChange === nextProps.onLiveSessionChange &&
        prevProps.onLiveUsersChange === nextProps.onLiveUsersChange &&
        prevProps.noteStatus === nextProps.noteStatus &&
        prevProps.noteStatusMessage === nextProps.noteStatusMessage &&
        prevProps.noteStatusIssues === nextProps.noteStatusIssues
    );
});
