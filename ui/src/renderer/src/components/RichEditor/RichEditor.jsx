import { acceptCompletion, autocompletion, closeBrackets, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { vim, Vim } from '@replit/codemirror-vim';
import { Prec } from '@uiw/react-codemirror';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { purrmd, PurrMDFeatures, purrmdTheme } from 'purrmd';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { cradleLinkColorPlugin, cradleLinksPlugin } from '../../utils/editorUtils/cradleLinksPlugins';
import { createCradleTheme } from '../../utils/editorUtils/editorTheme';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FileTable from '../FileTable/FileTable';

/**
 * RichEditor component that uses PurrMD for WYSIWYG markdown editing
 * This component provides a rich-text editing mode for Markdown content with instant preview
 */
const RichEditor = forwardRef(function RichEditor({
    noteid,
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    setAlert,
    saveNote,
    additionalExtensions = [],
    source = false,
}, ref) {
    const [showFileList, setShowFileList] = useState(false);
    const { profile } = useProfile();
    const [lspLoaded, setLspLoaded] = useState(false);
    const { isDarkMode } = useTheme();
    const { entriesApi, notesApi, lspApi } = useApi();
    const { navigate } = useCradleNavigate();
    const editorRef = useRef(null);
    const editorViewRef = useRef(null);
    const markdownContentRef = useRef(markdownContent);
    const [entryColors, setEntryColors] = useState(new Map());

    useEffect(() => {
        const fetchEntryColors = async () => {
            try {
                const entries = await entriesApi.entryClassesList({});
                const colorMap = new Map();
                for (const entry of entries) {
                    colorMap.set(entry.subtype, entry.color);
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
        return new CradleEditor({}, setLspLoaded, displayError(setAlert), notesApi, lspApi);
    }, [setAlert, notesApi, lspApi]);

    const extensions = useMemo(() => {
        if (entryColors.size === 0) {
            return [];
        }

        let exts = [
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
                        onCodeBlockInfoClick: (lang, code, event) => {
                            if (event && event.target) {
                                const originalText = event.target.innerText;
                                event.target.innerText = 'Copied!';
                                setTimeout(() => {
                                    event.target.innerText = originalText;
                                }, 900);
                            }
                            if (typeof code === 'string') {
                                navigator.clipboard.writeText(code);
                            }
                        }
                    }
                }
            }),
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
            autocompletion(),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            ...additionalExtensions,
        ];

        if (source) {
            exts.push(lineNumbers());
        }

        if (profile?.vim_mode) {
            Vim.defineEx('write', 'w', (cm) => {
                setMarkdownContent(cm.state.doc.toString());
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
    ]);

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
                    dispatch: (tr) => {
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
            editorViewRef.current.dispatch({
                changes: {
                    from: 0,
                    to: editorViewRef.current.state.doc.length,
                    insert: markdownContent
                }
            });
        }
    }, [markdownContent]);

    const insertTextToCodeMirror = useCallback((text) => {
        if (editorViewRef.current) {
            const doc = editorViewRef.current.state;
            editorViewRef.current.dispatch(doc.replaceSelection(text));
        }
    }, []);

    const toggleFileList = useCallback(() => {
        setShowFileList((prev) => !prev);
    }, []);

    return (
        <div className='h-full w-full flex flex-col flex-1'>
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
        prevProps.source === nextProps.source
    );
});
