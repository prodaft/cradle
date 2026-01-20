import { useTheme } from '@/contexts/ui';
import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { CradleEditor } from '@/utils/editor/enhancements';
import {
    cradleLinkColorPlugin,
    cradleLinksPlugin,
    headingLineClassPlugin,
} from '@/utils/editor/linkplugin';
import {
    referenceLinksPlugin,
    referenceLinkSyntax,
} from '@/utils/editor/referenceLinks';
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
import { EditorState, Extension, StateEffect, Transaction } from '@codemirror/state';
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
    markdownTags,
    prosemarkBaseThemeSetup,
    prosemarkBasicSetup,
    prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { CodeMirror, vim, Vim } from '@replit/codemirror-vim';
import { FileDownload, FileReferenceWithNote } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Prec } from '@uiw/react-codemirror';
import { CaretDownIcon } from '@phosphor-icons/react';
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
import FileUploadModal from '../../dialogs/notes/FileUploadModal';
import FileTable from '../files/FileTable';

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
    },
    ref,
) {
    const [showFileList, setShowFileList] = useState(false);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [clipboardFiles, setClipboardFiles] = useState<File[]>([]);
    const { usersApi } = useApi();
    const { isLoggedIn } = useAuthActions();
    const { data: profile } = useQuery({
        queryKey: queryKeys.users.detail('me'),
        queryFn: () => usersApi.usersRetrieve({ userId: 'me' }),
        enabled: isLoggedIn(),
        meta: { showErrorToast: false },
    });
    const { isDarkMode } = useTheme();
    const { entriesApi, fileTransferApi } = useApi();
    const router = useRouter();
    const navigate = (url: string) => {
        router.navigate({ to: url as any });
    };
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());

    const downloadFileMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const response = await fileTransferApi.fileTransferDownloadRetrieve({
                fileId,
            });
            return response;
        },
        meta: {
            suppressNotification: true,
        },
    });

    const fetchEntryColorsMutation = useMutation({
        mutationFn: async () => {
            const entries = await entriesApi.entryClassesList({});
            return entries;
        },
        meta: {
            suppressNotification: true,
        },
    });

    // Memoize the file download function to prevent recreation on every render
    const fileDownloadFn = useMemo(
        () =>
            async (file: { fileId: string }): Promise<FileDownload> => {
                return await downloadFileMutation.mutateAsync(file.fileId);
            },
        [downloadFileMutation],
    );

    // Fetch entry colors once on mount
    useEffect(() => {
        let isMounted = true;
        const fetchEntryColors = async () => {
            try {
                const entries = await fetchEntryColorsMutation.mutateAsync();
                if (!isMounted) return;
                const colorMap = new Map<string, string>();
                for (const entry of entries) {
                    if (entry.color) {
                        colorMap.set(entry.subtype, entry.color);
                    }
                }
                setEntryColors(colorMap);
            } catch (error) {
                if (isMounted) {
                    logger.error('Failed to fetch entry colors:', error);
                }
            }
        };
        fetchEntryColors();
        return () => {
            isMounted = false;
        };
    }, [entriesApi]);

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
                        navigator.clipboard.writeText(code);
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
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (file) {
                                files.push(file);
                            }
                        }
                    }

                    if (files.length > 0) {
                        event.preventDefault();
                        setClipboardFiles(files);
                        setShowFileUploadModal(true);
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
            mappings[`${file.id}-${file.fileName}`] = file;
        }
        return mappings;
    }, [fileData, propReferenceMappings]);

    // Build extensions - only rebuild when actually necessary
    const extensions = useMemo(() => {
        let exts: Extension[] = [
            cradleLinksPlugin(entryColors, navigate, source),
            cradleLinkColorPlugin(entryColors, source),
            headingLineClassPlugin(source),
            referenceLinksPlugin(referenceMappings, navigate, fileDownloadFn, source),
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
            ...indentationMarkers({
                highlightActiveBlock: true,
                hideFirstIndent: false,
                markerType: 'codeOnly',
                thickness: 0.5,
                colors: {
                    light: 'var(--muted) / 0.3',
                    dark: 'var(--muted-foreground) / 0.2',
                },
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
            keymap.of([
                {
                    key: 'Ctrl-s',
                    run: (cm: EditorView) => {
                        if (!enableEditing) return false;
                        setMarkdownContent(cm.state.doc.toString());
                        saveNote(true);
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

        if (profile?.vimMode) {
            Vim.defineEx('write', 'w', (cm: CodeMirror) => {
                try {
                    setMarkdownContent(cm.cm6.state.doc.toString());
                    saveNote(true);
                } catch (error) {
                    toast.error('Failed to save note. Please try again with Ctrl-S.');
                    logger.error('Failed to save note:', error);
                }
                return true;
            });
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        profile?.vimMode,
        additionalExtensions,
        entryColors,
        navigate,
        source,
        enableEditing,
        cradleTheme,
        setMarkdownContent,
        saveNote,
        codeBlockCopyExtension,
        pasteHandler,
        referenceMappings,
        fileDownloadFn,
    ]);

    // Reconfigure extensions when they change
    useEffect(() => {
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                effects: [StateEffect.reconfigure.of(extensions)],
            });
        }
    }, [extensions]);

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
                    dispatch: (tr: Transaction) => {
                        view.update([tr]);
                        if (tr.docChanged) {
                            const newContent = tr.state.doc.toString();
                            if (newContent !== markdownContentRef.current) {
                                setMarkdownContent(newContent);
                            }
                        }
                        if (tr.selection) {
                            const line = tr.state.doc.lineAt(
                                tr.state.selection.main.head,
                            ).number;
                            setLineNumber(line);
                        }
                    },
                });

                editorViewRef.current = view;
            } catch (error) {
                logger.error('Failed to initialize RichEditor:', error);
                toast.error(
                    `Failed to initialize editor: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
                );
            }
        }
    }, [extensions]);

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
    }, []);

    const insertTextToCodeMirror = useCallback((text: string) => {
        const view = editorViewRef.current;
        if (view) {
            view.dispatch(view.state.update(view.state.replaceSelection(text)));
        }
    }, []);

    const toggleFileList = useCallback(() => setShowFileList((prev) => !prev), []);

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
                    ref={editorRef}
                    className='absolute inset-0 rich-editor markdown-body'
                    role='textbox'
                    aria-label='Rich text editor'
                    aria-multiline='true'
                    tabIndex={0}
                    style={{ backgroundColor: 'transparent' }}
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
                            weight="bold"
                        />
                        <span>Attached Files</span>
                        <span className='text-xs text-muted-foreground ml-1'>
                            ({fileData.length})
                        </span>
                    </button>
                    {showFileList && (
                        <div className='overflow-auto flex-1 min-h-24 border-t border-border'>
                            <FileTable
                                fileData={fileData}
                                setFileData={setFileData}
                                insertTextCallback={insertTextToCodeMirror}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* File Upload Modal */}
            <FileUploadModal
                open={showFileUploadModal}
                onOpenChange={(open) => {
                    setShowFileUploadModal(open);
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
        prevProps.setMarkdownContent === nextProps.setMarkdownContent &&
        prevProps.setFileData === nextProps.setFileData &&
        prevProps.saveNote === nextProps.saveNote &&
        prevProps.referenceMappings === nextProps.referenceMappings
    );
});
