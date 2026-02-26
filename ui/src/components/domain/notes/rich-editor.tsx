import FileUploadDialog from '@/components/domain/notes/dialogs/file-upload-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ui';
import { useAuthActions } from '@/hooks/auth/use-auth';
import { CradleEditor } from '@/utils/editor/enhancements';
import {
    cradleLinkColorPlugin,
    cradleLinksPlugin,
    headingLineClassPlugin,
} from '@/utils/editor/link-plugin';
import {
    referenceLinksPlugin,
    referenceLinkSyntax,
} from '@/utils/editor/reference-links';
import { tablePlugin } from '@/utils/editor/table-plugin';
import { createCradleTheme } from '@/utils/editor/theme';
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
import { EditorState, Extension, Prec, StateEffect } from '@codemirror/state';
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
import { CaretDownIcon } from '@phosphor-icons/react';
import {
    additionalMarkdownSyntaxTags,
    baseSyntaxHighlights,
    clickLinkHandler,
    markdownTags,
    prosemarkBaseThemeSetup,
    prosemarkBasicSetup,
    prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { CodeMirror, vim, Vim } from '@replit/codemirror-vim';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import FileTable from './file-table';
import { getSaveStatus } from './status-indicators';

type FileDownload = components['schemas']['FileDownload'];
type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

// Type alias for compatibility with referenceLinks
type FileReference = FileReferenceWithNote;

interface RichEditorProps {
    noteid: string;
    markdownContent: string;
    setMarkdownContent: (content: string) => void;
    fileData: FileReference[];
    setFileData: (data: FileReference[]) => void;
    saveNote: (autoSave?: boolean) => void;
    additionalExtensions?: Extension[];
    enableEditing?: boolean;
    source?: boolean;
    setLineNumber: (lineNumber: number) => void;
    editorUtils: CradleEditor;
    referenceMappings?: Record<string, FileReference>;
    saving?: boolean;
    hasUnsavedChanges?: boolean;
}

export interface RichEditorRef {
    view: EditorView | null;
}

// Custom syntax highlighting for source mode - colors and text decorations
// Uses Prosemark CSS variables which are now mapped to our theme colors in createCradleTheme
const sourceModeSyntaxHighlighting = syntaxHighlighting(
    HighlightStyle.define([
        // Markdown syntax elements
        { tag: markdownTags.headerMark, color: 'var(--pm-header-mark-color)' },
        { tag: markdownTags.listMark, color: 'var(--pm-header-mark-color)' },
        { tag: tags.strong, fontWeight: 'bold' },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through' },
        { tag: tags.meta, color: 'var(--pm-muted-color)' },
        { tag: tags.comment, color: 'var(--pm-syntax-comment)' },
        { tag: markdownTags.escapeMark, color: 'var(--pm-muted-color)' },
        { tag: markdownTags.inlineCode, color: 'var(--pm-syntax-keyword)' },
        {
            tag: markdownTags.linkURL,
            color: 'var(--pm-link-color)',
            textDecoration: 'underline',
        },
        // Code block syntax highlighting
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

/**
 * RichEditor component that uses CodeMirror for markdown editing
 */
const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(function RichEditor(
    {
        noteid,
        markdownContent,
        setMarkdownContent,
        fileData,
        setFileData,
        saveNote,
        additionalExtensions = [],
        enableEditing = true,
        source = false,
        editorUtils,
        setLineNumber,
        referenceMappings: propReferenceMappings,
        saving = false,
        hasUnsavedChanges = false,
    },
    ref,
) {
    const [showFileList, setShowFileList] = useState(false);
    const [showFileUploadDialog, setShowFileUploadDialog] = useState(false);
    const [clipboardFiles, setClipboardFiles] = useState<File[]>([]);
    const [editorReady, setEditorReady] = useState(false);
    const { isLoggedIn } = useAuthActions();
    const { data: profile } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: 'me' } } },
        { enabled: isLoggedIn(), meta: { showErrorToast: false } },
    );
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const routerRef = useRef(router);
    routerRef.current = router;
    // Stable navigate function — uses ref to avoid invalidating extensions memo
    const navigate = useCallback((url: string) => {
        // Parse dashboard URLs to extract params
        const dashboardMatch = url.match(/^\/dashboards\/([^/]+)\/([^/]+)\/?$/);
        if (dashboardMatch) {
            const [, subtype, name] = dashboardMatch;
            routerRef.current.navigate({
                to: '/dashboards/$subtype/$name',
                params: {
                    subtype: decodeURIComponent(subtype),
                    name: decodeURIComponent(name),
                },
            });
        } else {
            routerRef.current.navigate({ to: url as any });
        }
    }, []);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const setMarkdownContentRef = useRef(setMarkdownContent);
    const saveNoteRef = useRef(saveNote);
    const setLineNumberRef = useRef(setLineNumber);
    const prevNoteIdRef = useRef(noteid);
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());

    const onUpdate = useMemo(
        () =>
            EditorView.updateListener.of((u) => {
                if (u.docChanged) setMarkdownContentRef.current(u.state.doc.toString());
                const line = u.state.doc.lineAt(u.state.selection.main.head).number;
                setLineNumberRef.current(line);
            }),
        [],
    );

    const downloadFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/file-transfer/download/',
                { params: { query: { fileId } } },
            );
            if (error) throw { response };
            return {
                presigned_url: data!.presigned_url,
                expires_in: data!.expires_in,
            } satisfies FileDownload;
        },
        meta: {
            suppressNotification: true,
        },
    });

    const { data: entryClassesData } = $api.useQuery(
        'get',
        '/entries/entry_classes/',
        {},
        {
            refetchOnWindowFocus: false,
            meta: { showErrorToast: false, suppressNotification: true },
        },
    );

    useEffect(() => {
        if (entryClassesData == null) return;
        const results = entryClassesData.results ?? [];
        const colorMap = new Map<string, string>();
        for (const entry of results) {
            if (entry.color) {
                colorMap.set(entry.subtype, entry.color);
            }
        }
        setEntryColors((prev) => {
            if (
                prev.size !== colorMap.size ||
                [...prev.entries()].some(([k, v]) => colorMap.get(k) !== v) ||
                [...colorMap.entries()].some(([k, v]) => prev.get(k) !== v)
            )
                return colorMap;
            return prev;
        });
    }, [entryClassesData]);

    const downloadMutateRef = useRef(downloadFileMutation.mutateAsync);
    downloadMutateRef.current = downloadFileMutation.mutateAsync;

    const fileDownloadFn = useCallback(
        async (file: { fileId: string }): Promise<FileDownload> => {
            return (await downloadMutateRef.current(file.fileId)) as FileDownload;
        },
        [],
    );

    // Theme uses CSS variables, so we only need to update when isDarkMode changes for the dark flag
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
    }, [setMarkdownContent, saveNote, setLineNumber]);

    // Memoize code block copy handler
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

    // Handle paste events to detect files
    const pasteHandler = useMemo(() => {
        return Prec.high(
            EditorView.domEventHandlers({
                paste: (event) => {
                    const items = event.clipboardData?.items;
                    if (!items) return false;

                    const files: File[] = [];
                    let hasText = false;
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (file) files.push(file);
                        } else if (
                            item.kind === 'string' &&
                            (item.type === 'text/plain' || item.type === 'text/html')
                        ) {
                            hasText = true;
                        }
                    }

                    if (files.length > 0 && !hasText) {
                        event.preventDefault();
                        setClipboardFiles(files);
                        setShowFileUploadDialog(true);
                        return true;
                    }
                    return false;
                },
            }),
        );
    }, []);

    // Use prop referenceMappings if provided, otherwise compute from fileData
    const referenceMappings = useMemo(() => {
        if (propReferenceMappings) return propReferenceMappings;
        const mappings: Record<string, FileReference> = {};
        for (const file of fileData) {
            if (file.id) mappings[file.id] = file;
            mappings[`${file.id}-${file.file_name}`] = file;
        }
        return mappings;
    }, [fileData, propReferenceMappings]);

    // Build extensions - only rebuild when actually necessary
    const extensions = useMemo(() => {
        let exts: Extension[] = [
            cradleLinksPlugin(entryColors, navigate, source),
            cradleLinkColorPlugin(entryColors, source),
            headingLineClassPlugin(source),
            referenceLinksPlugin(referenceMappings, fileDownloadFn, source),
            tablePlugin(entryColors, navigate, source),
            yamlFrontmatter({
                content: markdown({
                    codeLanguages: languages,
                    extensions: [
                        GFM,
                        editorUtils.extension(),
                        referenceLinkSyntax(referenceMappings || {}),
                        ...(source
                            ? [additionalMarkdownSyntaxTags]
                            : [prosemarkMarkdownSyntaxExtensions]),
                    ],
                }),
            }),
            ...(!source
                ? [
                      prosemarkBasicSetup(),
                      prosemarkBaseThemeSetup(),
                      htmlBlockExtension,
                      codeBlockCopyExtension,
                      clickLinkHandler.of((url: string) => {
                          window.open(url, '_blank', 'noopener,noreferrer');
                      }),
                      // Syntax highlighting for both modes
                      baseSyntaxHighlights,
                  ]
                : [sourceModeSyntaxHighlighting]),
            pasteHandler,
            Prec.high(cradleTheme),
            EditorView.lineWrapping,
            history(),
            search({ top: true }),
            highlightSelectionMatches(),
            drawSelection(),
            rectangularSelection(),
            highlightActiveLine(),
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
            EditorState.readOnly.of(!enableEditing),
            EditorView.editable.of(enableEditing),
            onUpdate,
            keymap.of([
                {
                    key: 'Mod-s',
                    run: (cm: EditorView) => {
                        if (!enableEditing) return false;
                        setMarkdownContentRef.current(cm.state.doc.toString());
                        saveNoteRef.current(true);
                        return true;
                    },
                },
            ]),
            autocompletion(),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            EditorView.theme({
                '&': { height: '100%' },
                '.cm-scroller': { overflow: 'auto' },
            }),
            ...additionalExtensions,
        ];

        if (source) {
            exts.push(lineNumbers());
        } else {
            // Hide gutters in Rich Editor mode
            exts.push(
                EditorView.theme({
                    '.cm-gutters': { display: 'none' },
                    '.cm-content': { padding: '1rem' },
                }),
            );
        }

        if (profile?.vim_mode) {
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        profile?.vim_mode,
        additionalExtensions,
        entryColors,
        source,
        enableEditing,
        cradleTheme,
        codeBlockCopyExtension,
        pasteHandler,
        referenceMappings,
        navigate,
        fileDownloadFn,
        onUpdate,
    ]);

    useEffect(() => {
        if (profile?.vim_mode) {
            Vim.defineEx('write', 'w', (cm: CodeMirror) => {
                try {
                    setMarkdownContentRef.current(cm.cm6.state.doc.toString());
                    saveNoteRef.current(true);
                } catch (error) {
                    toast.error('Failed to save note. Please try again with Ctrl-S.');
                    logger.error('Failed to save note:', error);
                }
                return true;
            });
        }
    }, [profile?.vim_mode]);

    // Reconfigure extensions when they change
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
                editorViewRef.current.destroy();
                editorViewRef.current = null;
                setEditorReady(false);
            }
            prevNoteIdRef.current = noteid;
        }
    }, [noteid]);

    // Initialize editor
    useEffect(() => {
        if (!editorViewRef.current && editorRef.current && extensions.length > 0) {
            try {
                logger.debug('[RichEditor] initializing editor', {
                    noteId: noteid,
                    initialDocLength: markdownContent.length,
                    extensionsCount: extensions.length,
                });
                const state = EditorState.create({
                    doc: markdownContent,
                    extensions,
                });

                const view = new EditorView({
                    state,
                    parent: editorRef.current,
                });

                editorViewRef.current = view;
                setEditorReady(true);
            } catch (error) {
                logger.error('Failed to initialize RichEditor:', error);
                toast.error(
                    `Failed to initialize editor: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
                );
            }
        }
    }, [noteid, markdownContent, extensions]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (editorViewRef.current) {
                editorViewRef.current.destroy();
                editorViewRef.current = null;
            }
        };
    }, []);

    // Sync external content changes
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

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
    }, [markdownContent]);

    // Update search panel labels - only observe when editor exists
    useEffect(() => {
        if (!editorReady) return;
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
    }, [editorReady]);

    const insertTextToCodeMirror = useCallback((text: string) => {
        const view = editorViewRef.current;
        if (view) {
            view.dispatch(view.state.update(view.state.replaceSelection(text)));
        }
    }, []);

    const toggleFileList = useCallback(() => setShowFileList((prev) => !prev), []);

    const wordCount = useMemo(
        () => markdownContent.trim().split(/\s+/).filter(Boolean).length,
        [markdownContent],
    );
    const charCount = markdownContent.length;
    const saveStatus = getSaveStatus(markdownContent, saving, hasUnsavedChanges);

    const handleFilesChange = useCallback(
        (files: FileReferenceWithNote[]) => {
            setFileData(files as FileReference[]);
        },
        [setFileData],
    );

    return (
        <div className='h-full w-full flex flex-col overflow-hidden'>
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
            {fileData && fileData.length > 0 && (
                <div className='flex-none max-h-[30%] flex flex-col z-30 border-t border-border bg-card'>
                    <button
                        type='button'
                        className='flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer w-full text-left'
                        onClick={toggleFileList}
                    >
                        <CaretDownIcon
                            className={`size-4 text-muted-foreground transition-transform duration-200 ${showFileList ? '' : '-rotate-90'}`}
                            weight='bold'
                        />
                        <span>Attached Files</span>
                        <span className='text-xs text-muted-foreground ml-1'>
                            ({fileData.length})
                        </span>
                    </button>
                    {showFileList && (
                        <ScrollArea className='flex-1 min-h-24 border-t border-border'>
                            <FileTable
                                fileData={fileData}
                                setFileData={setFileData}
                                insertTextCallback={insertTextToCodeMirror}
                            />
                            <ScrollBar orientation='horizontal' />
                        </ScrollArea>
                    )}
                </div>
            )}

            {/* Bottom toolbar: word count, character count, check icon, save status */}
            <div className='flex-none flex items-center justify-end gap-4 px-3 py-1.5 border-t border-border bg-muted/30 text-muted-foreground text-xs'>
                <span>{wordCount} words</span>
                <span>{charCount} chars</span>
                {profile?.vim_mode && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-cradle-bg-secondary text-cradle-text-secondary border border-cradle-border-accent'>
                                <span className='w-1.5 h-1.5 rounded-full bg-green-500' />
                                <span className='cradle-mono'>Vim</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Vim mode enabled</TooltipContent>
                    </Tooltip>
                )}
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='14'
                    height='14'
                    fill='currentColor'
                    viewBox='0 0 256 256'
                    className='text-primary shrink-0'
                    aria-hidden
                >
                    <path d='M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z' />
                </svg>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={`flex items-center justify-center w-1.5 h-1.5 rounded-full shrink-0 ${
                                saveStatus === 'saved'
                                    ? 'bg-primary'
                                    : saveStatus === 'saving'
                                      ? 'bg-accent'
                                      : saveStatus === 'unsaved'
                                        ? 'bg-destructive'
                                        : 'bg-muted-foreground'
                            }`}
                            data-testid='save-status-dot'
                            data-state={saveStatus}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        {saveStatus === 'saved'
                            ? 'All changes saved'
                            : saveStatus === 'saving'
                              ? 'Saving...'
                              : saveStatus === 'unsaved'
                                ? 'Unsaved changes'
                                : 'Cannot save empty note'}
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* File Upload Dialog */}
            <FileUploadDialog
                open={showFileUploadDialog}
                onOpenChange={(open) => {
                    setShowFileUploadDialog(open);
                    if (!open) setClipboardFiles([]);
                }}
                files={fileData as FileReferenceWithNote[]}
                onFilesChange={handleFilesChange}
                initialFiles={clipboardFiles}
                noteId={noteid}
            />
        </div>
    );
});

export default memo(RichEditor, (prevProps, nextProps) => {
    return (
        prevProps.noteid === nextProps.noteid &&
        prevProps.markdownContent === nextProps.markdownContent &&
        prevProps.fileData === nextProps.fileData &&
        prevProps.additionalExtensions === nextProps.additionalExtensions &&
        prevProps.source === nextProps.source &&
        prevProps.enableEditing === nextProps.enableEditing &&
        prevProps.editorUtils === nextProps.editorUtils &&
        prevProps.setFileData === nextProps.setFileData &&
        prevProps.setMarkdownContent === nextProps.setMarkdownContent &&
        prevProps.saveNote === nextProps.saveNote &&
        prevProps.setLineNumber === nextProps.setLineNumber &&
        prevProps.referenceMappings === nextProps.referenceMappings &&
        prevProps.saving === nextProps.saving &&
        prevProps.hasUnsavedChanges === nextProps.hasUnsavedChanges
    );
});
