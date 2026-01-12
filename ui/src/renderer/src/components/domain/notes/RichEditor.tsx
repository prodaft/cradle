import { useNotif } from '@/contexts';
import { useTheme } from '@/contexts/ui/ThemeContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { CradleEditor } from '@/utils/editor/enhancements';
import { cradleLinkColorPlugin, cradleLinksPlugin } from '@/utils/editor/linkplugin';
import {
    referenceLinksPlugin,
    referenceLinkSyntax,
} from '@/utils/editor/referenceLinks';
import { createCradleTheme } from '@/utils/editor/theme';
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
import { FileReference, FileReferenceWithNote } from '@services/cradle/models';
import { Prec } from '@uiw/react-codemirror';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
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
import FileUploadModal from '../../modals/notes/FileUploadModal';
import FileTable from '../files/FileTable';

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
const sourceModeSyntaxHighlighting = syntaxHighlighting(
    HighlightStyle.define([
        // Markdown syntax elements
        { tag: markdownTags.headerMark, color: 'var(--pm-header-mark-color)' },
        { tag: markdownTags.listMark, color: 'var(--pm-header-mark-color)' },
        { tag: tags.strong, fontWeight: 'bold' },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through' },
        { tag: tags.meta, color: 'var(--pm-muted-color)' },
        { tag: tags.comment, color: 'var(--pm-muted-color)' },
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
    const { profile } = useProfile();
    const vimModeEnabled = Boolean(profile?.vimMode);
    const { isDarkMode } = useTheme();
    const { entriesApi, fileTransferApi } = useApi();
    const { navigate } = useCradleNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());
    const { executor } = useAPICall();
    const { notify } = useNotif();

    // Memoize the file download function to prevent recreation on every render
    const fileDownloadFn = useMemo(
        () =>
            executor(
                fileTransferApi.fileTransferDownloadRetrieve.bind(fileTransferApi),
            ),
        [executor, fileTransferApi],
    );

    // Fetch entry colors once on mount
    useEffect(() => {
        let isMounted = true;
        const fetchEntryColors = async () => {
            try {
                const entries = await entriesApi.entryClassesList({});
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
                    console.error('Failed to fetch entry colors:', error);
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
                    light: 'rgba(100, 100, 100, 0.2)',
                    dark: 'rgba(200, 200, 200, 0.15)',
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
                keymap.of([...completionKeymap, { key: 'Tab', run: acceptCompletion }]),
            ),
            keymap.of([
                indentWithTab,
                ...defaultKeymap,
                ...historyKeymap,
                ...searchKeymap,
            ]),
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

        if (vimModeEnabled) {
            Vim.defineEx('write', 'w', (cm: CodeMirror) => {
                try {
                    setMarkdownContent(cm.cm6.state.doc.toString());
                    saveNote(true);
                } catch (error) {
                    notify({
                        type: 'error',
                        text: 'Failed to save note. Please try again with Ctrl-S.',
                    });
                    console.error('Failed to save note:', error);
                }
                return true;
            });
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        vimModeEnabled,
        additionalExtensions,
        entryColors,
        navigate,
        source,
        enableEditing,
        cradleTheme,
        saveNote,
        setMarkdownContent,
        codeBlockCopyExtension,
        pasteHandler,
        referenceMappings,
        fileDownloadFn,
        notify,
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
                console.error('Failed to initialize RichEditor:', error);
                notify({
                    type: 'error',
                    text: `Failed to initialize editor: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`,
                });
            }
        }
    }, [extensions, notify]);

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

    const handleFileUploadModalClose = useCallback(() => {
        setShowFileUploadModal(false);
        setClipboardFiles([]);
    }, []);

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
                <div className='flex-none max-h-[25%] rounded-md flex flex-col justify-end z-30'>
                    <div
                        className='bg-gray-5 dark:bg-gray-3 dark:text-zinc-200 px-4 py-[2px] hover:cursor-pointer flex flex-row space-x-2 border-b border-cradle-border-primary'
                        onClick={toggleFileList}
                    >
                        <span>
                            {showFileList ? (
                                <NavArrowDown width='20px' />
                            ) : (
                                <NavArrowUp width='20px' />
                            )}
                        </span>
                        <span>
                            {showFileList
                                ? 'Hide Uploaded Files'
                                : 'Show Uploaded Files'}
                        </span>
                    </div>
                    <div
                        className={`overflow-auto h-full rounded-md ${showFileList && 'min-h-24'}`}
                    >
                        {showFileList && (
                            <FileTable
                                fileData={fileData}
                                setFileData={setFileData}
                                insertTextCallback={insertTextToCodeMirror}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* File Upload Modal */}
            {showFileUploadModal && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
                    onClick={handleFileUploadModalClose}
                >
                    <div
                        className='bg-cradle-bg-primary rounded-lg shadow-xl p-6'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <FileUploadModal
                            files={fileData as FileReferenceWithNote[]}
                            onFilesChange={handleFilesChange}
                            closeModal={handleFileUploadModalClose}
                            initialFiles={clipboardFiles}
                            noteId={noteid}
                        />
                    </div>
                </div>
            )}
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
        prevProps.saveNote === nextProps.saveNote &&
        prevProps.setMarkdownContent === nextProps.setMarkdownContent &&
        prevProps.setFileData === nextProps.setFileData &&
        prevProps.referenceMappings === nextProps.referenceMappings
    );
});
