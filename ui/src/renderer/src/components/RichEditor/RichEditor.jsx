import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, keymap, rectangularSelection } from '@codemirror/view';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { debounce } from 'lodash';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FileTable from '../FileTable/FileTable';

// Import PurrMD
import { purrmd, purrmdTheme } from 'purrmd';

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
    currentLine,
    setCurrentLine,
    setAlert,
    saveNote,
    additionalExtensions = [],
}, ref) {
    const [showFileList, setShowFileList] = useState(false);
    const { profile } = useProfile();
    const [lspLoaded, setLspLoaded] = useState(false);
    const { isDarkMode } = useTheme();
    const editorRef = useRef(null);
    const editorViewRef = useRef(null);
    const markdownContentRef = useRef(markdownContent);
    const currentLineRef = useRef(currentLine);


    const cradleTheme = EditorView.theme(
        {
            '&': {
                backgroundColor: 'var(--cradle-bg-primary)',
                color: 'var(--cradle-text-primary)',
            },
            '.cm-content': {
                color: 'var(--cradle-text-primary)',
                // Primary colors
                '--purrmd-primary-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-opacity': '0.7',

                // Headings
                '--purrmd-h1-size': '1.802em',
                '--purrmd-h2-size': '1.602em',
                '--purrmd-h3-size': '1.424em',
                '--purrmd-h4-size': '1.266em',
                '--purrmd-h5-size': '1.125em',
                '--purrmd-h6-size': '1em',
                '--purrmd-h1-weight': '600',
                '--purrmd-h2-weight': '600',
                '--purrmd-h3-weight': '600',
                '--purrmd-h4-weight': '500',
                '--purrmd-h5-weight': '500',
                '--purrmd-h6-weight': '500',
                '--purrmd-h-color': 'var(--cradle-text-primary)',
                '--purrmd-formatting-heading-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-h-opacity': '0.7',

                // Links
                '--purrmd-link-color': 'var(--cradle-accent-primary)',
                '--purrmd-link-url-color': 'var(--cradle-accent-secondary)',
                '--purrmd-link-title-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-link-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-link-opacity': '0.8',

                // Inline code
                '--purrmd-inline-code-bg-color': isDarkMode ? 'var(--cradle-bg-tertiary)' : 'var(--cradle-bg-secondary)',
                '--purrmd-inline-code-color': 'var(--cradle-text-primary)',
                '--purrmd-formatting-inline-code-color': 'var(--cradle-text-tertiary)',

                // Code blocks
                '--purrmd-code-block-bg-color': isDarkMode ? 'var(--cradle-bg-secondary)' : 'var(--cradle-bg-tertiary)',
                '--purrmd-code-block-border-radius': '0px',
                '--purrmd-code-block-info-bg-color': 'transparent',
                '--purrmd-code-block-info-bg-color-hover': isDarkMode ? 'rgba(255, 140, 0, 0.1)' : 'rgba(255, 140, 0, 0.08)',
                '--purrmd-formatting-code-block-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-code-opacity': '0.7',

                // Blockquotes
                '--purrmd-formatting-blockquote-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-blockquote-border-thickness': '2px',
                '--purrmd-formatting-blockquote-border-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-blockquote-opacity': '0.8',

                // Lists
                '--purrmd-formatting-bullet-list-item-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-item-point-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-ordered-list-item-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-task-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-ordered-list-task-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-opacity': '0.8',
                '--purrmd-formatting-ordered-list-opacity': '0.8',

                // Checkboxes
                '--purrmd-checkbox-list-height': '2rem',
                '--purrmd-checkbox-height': '1.0rem',
                '--purrmd-checkbox-color': 'var(--cradle-bg-elevated)',
                '--purrmd-checkbox-border-color': 'var(--cradle-border-accent)',
                '--purrmd-checkbox-checked-color': 'var(--cradle-accent-primary)',
                '--purrmd-checkbox-checked-border-color': 'var(--cradle-accent-primary)',

                // Strong/Bold
                '--purrmd-strong-weight': '600',
                '--purrmd-formatting-strong-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-strong-opacity': '0.8',
            },
            '.cm-editor': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-scroller': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
        },
        {
            dark: isDarkMode,
        },
    );

    // Expose editorViewRef to parent through ref
    useImperativeHandle(ref, () => ({
        view: editorViewRef.current,
    }), []);

    // Update refs when props change to avoid using stale values in callbacks
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        currentLineRef.current = currentLine;
    }, [currentLine]);

    // Stabilized callback for setCurrentLine to prevent re-rendering
    const debouncedSetCurrentLine = useRef(
        debounce((lineNumber) => {
            // Only update if the value is actually different
            if (currentLineRef.current !== lineNumber) {
                setCurrentLine(lineNumber);
            }
        }, 50),
    ).current;


    // Adjusted instantiation to pass an empty options object and the error handler
    const editorUtils = useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor({}, setLspLoaded, displayError(setAlert));
    }, [setAlert]);

    const extensions = useMemo(() => {
        let exts = [
            // Use PurrMD for WYSIWYG editing
            cradleTheme,
            purrmd(),
            purrmdTheme(),
            // Custom Cradle theme that replaces PurrMD's default theme
            EditorView.lineWrapping,
            history(),
            drawSelection(),
            rectangularSelection(),
            highlightActiveLine(),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle),
            keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
            ...editorUtils.autocomplete(),  // Add autocomplete
            editorUtils.lint(),            // Add linting
            ...additionalExtensions,
        ];

        if (profile?.vim_mode) {
            exts = exts.concat(editorUtils.vim());
        }

        return exts;
    }, [
        editorUtils,
        profile?.vim_mode,
        additionalExtensions,
        isDarkMode,
    ]);

    // Initialize the editor when the component mounts
    useEffect(() => {
        if (!editorViewRef.current && editorRef.current) {
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
                        // Handle content changes
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
    }, [extensions, setMarkdownContent, setAlert]);

    // Update editor content when markdownContent changes externally
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cancel any pending debounced calls
            debouncedSetCurrentLine.cancel?.();

            // Destroy editor view
            if (editorViewRef.current) {
                editorViewRef.current.destroy();
                editorViewRef.current = null;
            }
        };
    }, [debouncedSetCurrentLine]);

    useEffect(() => {
        if (!editorViewRef.current) {
            return;
        }

        // Skip if current line hasn't actually changed
        if (currentLineRef.current === currentLine) {
            return;
        }

        const view = editorViewRef.current;
        const state = view.state;
        const cursor = state.selection.main.to;
        const currentCursorLine = state.doc.lineAt(cursor);

        if (currentLine === currentCursorLine.number) {
            return;
        }

        const totalLines = state.doc.lines;
        const targetLine = Math.min(Math.max(1, currentLine), totalLines);

        const targetLinePos = state.doc.line(targetLine).from;

        const selection = { anchor: targetLinePos, head: targetLinePos };
        view.dispatch({
            selection,
            scrollIntoView: true,
        });
    }, [currentLine]);

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

// Use memo to prevent unnecessary re-renders when props haven't meaningfully changed
export default memo(RichEditor, (prevProps, nextProps) => {
    // Only re-render if these specific props have changed
    return (
        prevProps.noteid === nextProps.noteid &&
        prevProps.markdownContent === nextProps.markdownContent &&
        prevProps.currentLine === nextProps.currentLine &&
        prevProps.fileData === nextProps.fileData &&
        prevProps.additionalExtensions === nextProps.additionalExtensions
    );
});
