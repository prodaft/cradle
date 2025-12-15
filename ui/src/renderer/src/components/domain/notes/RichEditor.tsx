import { useNotif } from '@/contexts';
import { useTheme } from '@/contexts/ui/ThemeContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { CradleEditor } from '@/utils/editor/enhancements';
import { cradleLinkColorPlugin, cradleLinksPlugin } from '@/utils/editor/linkplugin';
import { referenceLinksPlugin, referenceLinkSyntax } from '@/utils/editor/referenceLinks';
import { createCradleTheme } from '@/utils/editor/theme';
import { classHighlightStyle } from '@/utils/editor/highlighting';
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
import { indentOnInput, syntaxHighlighting } from '@codemirror/language';
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
import { GFM } from '@lezer/markdown';
import {
    baseSyntaxHighlights,
    clickLinkHandler,
    prosemarkBaseThemeSetup,
    prosemarkBasicSetup,
    prosemarkMarkdownSyntaxExtensions,
} from '@prosemark/core';
import { htmlBlockExtension } from '@prosemark/render-html';
import { vim, Vim } from '@replit/codemirror-vim';
import { FileReference } from '@services/cradle/models';
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
    editorUtils: CradleEditor;
    referenceMappings?: Record<string, FileReference>;
}

export interface RichEditorRef {
    view: EditorView | null;
}

/**
 * RichEditor component that uses CodeMirror for markdown editing
 * This component provides a markdown editor with syntax highlighting
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
        referenceMappings: propReferenceMappings,
    },
    ref,
) {
    const [showFileList, setShowFileList] = useState(false);
    const { profile } = useProfile();
    const { isDarkMode } = useTheme();
    const { entriesApi, fileTransferApi } = useApi();
    const { navigate } = useCradleNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());
    const { executor } = useAPICall();
    const { notify } = useNotif();

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

    const handleCodeBlockCopy = useCallback(
        (lang: string, code: string, event: MouseEvent) => {
            if (event && event.target) {
                const target = event.target as HTMLElement;
                const originalText = target.innerText;
                target.innerText = 'Copied!';
                setTimeout(() => {
                    target.innerText = originalText;
                }, 900);
            }
            if (typeof code === 'string') {
                navigator.clipboard.writeText(code);
            }
        },
        [],
    );

    const codeBlockCopyExtension = useMemo(() => {
        return EditorView.domEventHandlers({
            click: (event, view) => {
                const target = event.target;
                if (
                    target instanceof HTMLElement &&
                    target.classList.contains('code-block-copy-btn')
                ) {
                    const codeBlock = target.closest('pre');
                    if (codeBlock) {
                        const code = codeBlock.textContent || '';
                        handleCodeBlockCopy('', code, event);
                    }
                    return true;
                }
                return false;
            },
        });
    }, [handleCodeBlockCopy]);

    // Use prop referenceMappings if provided, otherwise compute from fileData
    const referenceMappings = useMemo(() => {
        if (propReferenceMappings) {
            return propReferenceMappings;
        }
        const mappings: Record<string, FileReference> = {};
        for (const file of fileData) {
            mappings[file.minioFileName] = file;
        }
        return mappings;
    }, [fileData, propReferenceMappings]);

    const extensions = useMemo(() => {
        // Don't return empty array - allow editor to initialize with basic extensions
        // entryColors will be populated asynchronously and extensions will be reconfigured
        let exts: Extension[] = [
            cradleLinksPlugin(entryColors, navigate, source),
            cradleLinkColorPlugin(entryColors, source),
            referenceLinksPlugin(referenceMappings, navigate, executor(fileTransferApi.fileTransferDownloadRetrieve.bind(fileTransferApi))),
            // Markdown language support
            markdown({
                codeLanguages: languages,
                extensions: [
                    // GitHub Flavored Markdown (support for autolinks, strikethroughs)
                    GFM,
                    // ProseMark parsing only in Rich Editor mode
                    ...(!source ? [prosemarkMarkdownSyntaxExtensions] : []),
                    // Cradle editor extension
                    editorUtils.extension(),
                    referenceLinkSyntax(referenceMappings || {}),
                ],
            }),
            syntaxHighlighting(classHighlightStyle),
            // ProseMark setup only for Rich Editor (non-source) mode
            ...(!source
                ? [
                      prosemarkBasicSetup(),
                      prosemarkBaseThemeSetup(),
                      htmlBlockExtension,
                      codeBlockCopyExtension,
                      clickLinkHandler.of((url: string) => {
                          window.open(url, '_blank', 'noopener,noreferrer');
                      }),
                      baseSyntaxHighlights,
                  ]
                : []),
            EditorView.contentAttributes.of({
                'data-formatting-mode': source ? 'show' : 'auto',
            }),
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
                    ...completionKeymap,
                    {
                        key: 'Tab',
                        run: acceptCompletion,
                    },
                ]),
            ),
            keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
            EditorState.readOnly.of(!enableEditing),
            EditorView.editable.of(enableEditing),
            keymap.of([
                {
                    key: 'Ctrl-s',
                    run: (cm: EditorView) => {
                        if (!enableEditing) {
                            return false;
                        }
                        setMarkdownContent(cm.state.doc.toString());
                        saveNote(true);
                        return true;
                    },
                },
            ]),
            autocompletion(),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            ...additionalExtensions,
        ];

        if (source) {
            exts.push(lineNumbers());
        }

        // Hide gutters (e.g., fold gutter) in Rich Editor mode
        if (!source) {
            exts.push(
                EditorView.theme({
                    '.cm-gutters': { display: 'none' },
                    '.cm-content': { padding: '1rem' },
                }),
            );
        }

        if (profile?.vimMode) {
            // Vim types from @replit/codemirror-vim are not fully compatible with CodeMirror 6 types
            // The cm parameter is actually a CodeMirror instance with vim state, not a pure EditorView
            Vim.defineEx('write', 'w', (cm: any) => {
                setMarkdownContent(cm.state.doc.toString());
                saveNote(true);
                return true;
            });
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        profile?.vimMode,
        additionalExtensions,
        isDarkMode,
        entryColors,
        navigate,
        source,
        enableEditing,
        cradleTheme,
        saveNote,
        setMarkdownContent,
        codeBlockCopyExtension,
        referenceMappings,
    ]);

    useEffect(() => {
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                effects: [StateEffect.reconfigure.of(extensions)],
            });
        }
    }, [extensions]);

    useEffect(() => {
        if (!editorViewRef.current && editorRef.current && extensions.length > 0) {
            try {
                const state = EditorState.create({
                    doc: markdownContent,
                    extensions: extensions,
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
                    },
                });

                editorViewRef.current = view;
            } catch (error) {
                console.error('Failed to initialize RichEditor:', error);
                const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error occurred';
                notify({
                    type: 'error',
                    text: `Failed to initialize editor: ${errorMessage}. Please refresh the page.`,
                });
            }
        }
    }, [extensions, setMarkdownContent, notify, markdownContent]);

    // Cleanup: destroy editor view on unmount only
    useEffect(() => {
        return () => {
            if (editorViewRef.current) {
                editorViewRef.current.destroy();
                editorViewRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (
            editorViewRef.current &&
            markdownContent !== editorViewRef.current.state.doc.toString()
        ) {
            // Preserve cursor position when updating from external source
            const view = editorViewRef.current;
            const state = view.state;
            const selection = state.selection.main;
            const cursorPos = selection.head;

            // Only update if content actually changed (not just a re-render)
            const currentContent = state.doc.toString();
            if (currentContent !== markdownContent) {
                view.dispatch({
                    changes: {
                        from: 0,
                        to: state.doc.length,
                        insert: markdownContent,
                    },
                    // Try to preserve cursor position, but clamp to new document length
                    selection: {
                        anchor: Math.min(cursorPos, markdownContent.length),
                        head: Math.min(cursorPos, markdownContent.length),
                    },
                });
            }
        }
    }, [markdownContent]);

    // Update search panel labels when it opens
    useEffect(() => {
        if (!editorViewRef.current) return;

        const view = editorViewRef.current;
        const updateLabels = () => {
            const panel = view.dom.querySelector('.cm-search');
            if (!panel) return;

            const labels = panel.querySelectorAll('label');
            labels.forEach((label) => {
                const textNode = Array.from(label.childNodes).find(
                    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
                );
                if (textNode) {
                    const text = textNode.textContent?.trim() || '';
                    if (text === 'match case') {
                        textNode.textContent = 'Match Case';
                    } else if (text === 'by word') {
                        textNode.textContent = 'Match Whole Word';
                    } else if (text === 'regexp') {
                        textNode.textContent = 'Use Regular Expression';
                    }
                }
            });
        };

        // Watch for panel opening via MutationObserver
        const observer = new MutationObserver(() => {
            const panel = view.dom.querySelector('.cm-search');
            if (panel) {
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    updateLabels();
                });
            }
        });

        observer.observe(view.dom, {
            childList: true,
            subtree: true,
        });

        // Initial check
        requestAnimationFrame(() => {
            updateLabels();
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const insertTextToCodeMirror = useCallback((text: string) => {
        if (editorViewRef.current) {
            // CodeMirror 6 way to replace selection
            const state = editorViewRef.current.state;
            const transaction = state.update(state.replaceSelection(text));
            editorViewRef.current.dispatch(transaction);
        }
    }, []);

    const toggleFileList = useCallback(() => {
        setShowFileList((prev) => !prev);
    }, []);

    return (
        <div
            className={`${!source ? 'rich-editor markdown-body' : ''} h-full w-full flex flex-col flex-1`}
        >
            <div className='h-full w-full flex flex-col overflow-auto'>
                <div className='flex h-full overflow-y-hidden'>
                    <div
                        ref={editorRef}
                        className='w-full overflow-y-auto rounded-lg rich-editor markdown-body'
                        role='textbox'
                        aria-label='Rich text editor'
                        aria-multiline='true'
                        tabIndex={0}
                        style={{
                            minHeight: '400px',
                            backgroundColor: 'transparent',
                            color: isDarkMode ? '#FFFFFF' : '#000000',
                        }}
                    />
                </div>
            </div>
            {fileData && fileData.length > 0 && (
                <div className='max-h-[25%] rounded-md flex flex-col justify-end z-30'>
                    <div
                        className='bg-gray-5 dark:bg-gray-3 dark:text-zinc-200 px-4 py-[2px] mt-1 hover:cursor-pointer flex flex-row space-x-2'
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
