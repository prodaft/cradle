import { acceptCompletion, autocompletion, closeBrackets, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState, Extension, StateEffect, Transaction } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { vim, Vim } from '@replit/codemirror-vim';
import { Prec } from '@uiw/react-codemirror';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { purrmd, PurrMDFeatures, purrmdTheme } from 'purrmd';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useProfile } from '@/contexts/user/ProfileContext';
import { useTheme } from '@/contexts/ui/ThemeContext';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { cradleLinkColorPlugin, cradleLinksPlugin } from '@/utils/editor/linkplugin';
import { createCradleTheme } from '@/utils/editor/theme';
import { CradleEditor } from '@/utils/editor/enhancements';
import { displayError } from '@/utils/api';
import FileTable from '../files/FileTable';
import { FileReferenceWithNote } from '@/services/cradle/models';

interface RichEditorProps {
    noteid: string;
    markdownContent: string;
    setMarkdownContent: (content: string) => void;
    fileData: FileReferenceWithNote[];
    setFileData: (data: FileReferenceWithNote[]) => void;
    setAlert: (alert: any) => void;
    saveNote: (autoSave?: boolean) => void;
    additionalExtensions?: Extension[];
    enableEditing?: boolean;
    source?: boolean;
}

export interface RichEditorRef {
    view: EditorView | null;
}

/**
 * RichEditor component that uses PurrMD for WYSIWYG markdown editing
 * This component provides a rich-text editing mode for Markdown content with instant preview
 */
const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(function RichEditor({
    noteid,
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    setAlert,
    saveNote,
    additionalExtensions = [],
    enableEditing = true,
    source = false,
}, ref) {
    const [showFileList, setShowFileList] = useState(false);
    const { profile } = useProfile();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lspLoaded, setLspLoaded] = useState(false);
    const { isDarkMode } = useTheme();
    const { entriesApi, notesApi, lspApi } = useApi();
    const { navigate } = useCradleNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const markdownContentRef = useRef(markdownContent);
    const [entryColors, setEntryColors] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const fetchEntryColors = async () => {
            try {
                const entries = await entriesApi.entryClassesList({});
                const colorMap = new Map<string, string>();
                for (const entry of entries) {
                    if (entry.color) {
                        colorMap.set(entry.subtype, entry.color);
                    }
                }
                setEntryColors(colorMap);
            } catch (error) {
                console.error('Failed to fetch entry colors:', error);
            }
        };
        fetchEntryColors();
    }, [entriesApi]);

    const cradleTheme = useMemo(() => createCradleTheme(isDarkMode), [isDarkMode]);

    useImperativeHandle(ref, () => ({
        get view() {
            return editorViewRef.current;
        },
    }), []);

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    const editorUtils = useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor(lspApi, notesApi, {}, setLspLoaded, displayError(setAlert));
    }, [setAlert, notesApi, lspApi]);

    const extensions = useMemo(() => {
        if (entryColors.size === 0) {
            return [];
        }

        let exts: Extension[] = [
            cradleLinksPlugin(entryColors, navigate, source),
            cradleLinkColorPlugin(entryColors, source),
            purrmd({
                markdownExtConfig: {
                    extensions: [editorUtils.extension()],
                    codeLanguages: languages,
                },
                formattingDisplayMode: source ? 'show' : 'auto',
                defaultSlashMenu: {
                    show: false,
                },
                featuresConfigs: {
                    [PurrMDFeatures.CodeBlock]: {
                        onCodeBlockInfoClick: (lang: string, code: string, event: MouseEvent) => {
                            if (event && event.target && event.target instanceof HTMLElement) {
                                const originalText = event.target.innerText;
                                event.target.innerText = 'Copied!';
                                setTimeout(() => {
                                    if (event.target instanceof HTMLElement) {
                                        event.target.innerText = originalText;
                                    }
                                }, 900);
                            }
                            if (typeof code === 'string') {
                                navigator.clipboard.writeText(code);
                            }
                        }
                    }
                }
            }),
            EditorState.readOnly.of(!enableEditing),
            EditorView.editable.of(enableEditing),
            purrmdTheme(),
            Prec.high(cradleTheme),
            EditorView.lineWrapping,
            history(),
            drawSelection(),
            rectangularSelection(),
            highlightActiveLine(),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle),
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
            keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
            keymap.of([{
                key: 'Ctrl-s',
                run: (cm: EditorView) => {
                    if (!enableEditing) {
                        return false;
                    }
                    setMarkdownContent(cm.state.doc.toString());
                    saveNote(true);
                    return true;
                }
            }]),
            autocompletion(),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            ...additionalExtensions,
        ];

        if (source) {
            exts.push(lineNumbers());
        }

        if (profile?.vim_mode) {
            // @ts-ignore - Vim types are not fully compatible with CodeMirror 6 types or missing
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
        profile?.vim_mode,
        additionalExtensions,
        isDarkMode,
        entryColors,
        navigate,
        source,
        enableEditing,
        cradleTheme,
        saveNote,
        setMarkdownContent
    ]);

    useEffect(() => {
        if (editorViewRef.current) {
            editorViewRef.current.dispatch({
                effects: [
                    StateEffect.reconfigure.of(extensions)
                ]
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
                    }
                });

                editorViewRef.current = view;
            } catch (error) {
                console.error('Failed to initialize RichEditor:', error);
                setAlert({
                    type: 'error',
                    message: 'Failed to initialize editor. Please refresh the page.'
                });
            }
        }
    }, [extensions, setMarkdownContent, setAlert, markdownContent]);

    useEffect(() => {
        if (editorViewRef.current && markdownContent !== editorViewRef.current.state.doc.toString()) {
            // We only update if the difference is significant or if it's a fresh load
            // But here we just blindly update which might cause cursor jumps if typing fast and prop updates lag
            // However, markdownContentRef check in dispatch prevents local loops.
            // This effect handles external updates.
            
            // Simple check to avoid overwriting if the content is effectively the same (CodeMirror handles this efficiently usually)
             editorViewRef.current.dispatch({
                changes: {
                    from: 0,
                    to: editorViewRef.current.state.doc.length,
                    insert: markdownContent
                }
            });
        }
    }, [markdownContent]);

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
        <div className={`${!source ? 'rich-editor' : ''} h-full w-full flex flex-col flex-1`}>
            <div className='h-full w-full flex flex-col overflow-auto'>
                <div className='flex h-full overflow-y-hidden'>
                    <div
                        ref={editorRef}
                        className='w-full overflow-y-auto rounded-lg'
                        role="textbox"
                        aria-label="Rich text editor"
                        aria-multiline="true"
                        tabIndex={0}
                        style={{
                            minHeight: '400px',
                            backgroundColor: 'transparent',
                            color: isDarkMode ? '#FFFFFF' : '#000000'
                        }}
                    />
                </div>
            </div>
            {fileData && fileData.length > 0 && (
                <div className='max-h-[25%] rounded-md flex flex-col justify-end z-30'>
                    <div
                        className='bg-gray-5 dark:bg-gray-3 dark:text-zinc-200 px-4 py-[2px] my-1 rounded-md hover:cursor-pointer flex flex-row space-x-2'
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
        prevProps.enableEditing === nextProps.enableEditing
    );
});

