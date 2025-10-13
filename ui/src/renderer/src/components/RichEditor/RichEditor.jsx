import { EditorState, StateField, EditorSelection, RangeSetBuilder } from '@codemirror/state';
import { keymap, EditorView, drawSelection, rectangularSelection, highlightActiveLine, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { Table } from '@lezer/markdown';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { debounce } from 'lodash';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FileTable from '../FileTable/FileTable';

// Import the rich editor plugin
import richEditor from './richEditorPlugin';

// Import the markdoc config
import markdocConfig from './markdocConfig';

// Import the CSS styles
import './richEditorStyles.css';

/**
 * RichEditor component that uses codemirror-rich-markdoc for rich markdown editing
 * This component provides a hybrid rich-text editing mode for Markdown content
 */
function RichEditor({
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
}) {
    const [showFileList, setShowFileList] = useState(false);
    const { profile } = useProfile();
    const [lspLoaded, setLspLoaded] = useState(false);
    const { isDarkMode } = useTheme();
    const editorRef = useRef(null);
    const editorViewRef = useRef(null);
    const markdownContentRef = useRef(markdownContent);
    const currentLineRef = useRef(currentLine);

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
    }, []); // Remove setAlert dependency to prevent unnecessary recreations

    const extensions = useMemo(() => {
        // Heading decorations for each level (so CSS can target them)
        const hDeco = [
            Decoration.line({ attributes: { class: 'cm-renderlike-h1' } }),
            Decoration.line({ attributes: { class: 'cm-renderlike-h2' } }),
            Decoration.line({ attributes: { class: 'cm-renderlike-h3' } }),
            Decoration.line({ attributes: { class: 'cm-renderlike-h4' } }),
            Decoration.line({ attributes: { class: 'cm-renderlike-h5' } }),
            Decoration.line({ attributes: { class: 'cm-renderlike-h6' } }),
        ];

        // Quickly examine a single line; return 0..5 for H1..H6 or -1 if not heading
        function headingLevelForLine(text) {
            // Trim left? no—headings must start at col 0 per ATX spec for most renderers.
            const m = /^(#{1,6})\s(.*)$/.exec(text);
            if (!m) return -1;
            // Optional closing hashes are allowed; we don't care here.
            return m[1].length - 1; // 0..5
        }

        // Line decoration for revealing hidden tokens on selected lines
        const revealLineDeco = Decoration.line({ attributes: { class: 'cm-reveal-line' } });

        const headingRenderField = StateField.define({
            create() { 
                return Decoration.none; 
            },
            update(decos, tr) {
                // Recompute when doc, viewport, or selection might affect what we show
                if (!(tr.docChanged || tr.selection || tr.viewportChanged)) return decos;

                const b = new RangeSetBuilder();
                const { state } = tr;

                // Use current viewports for performance
                const vp = tr.view?.visibleRanges ?? [{ from: 0, to: state.doc.length }];

                for (const { from, to } of vp) {
                    // Walk line by line within the visible slice
                    let line = state.doc.lineAt(from);
                    while (line.from <= to) {
                        const lvl = headingLevelForLine(line.text);
                        if (lvl >= 0) {
                            b.add(line.from, line.from, hDeco[lvl]);
                        }
                        if (line.number >= state.doc.lines) break;
                        line = state.doc.line(line.number + 1);
                    }
                }

                return b.finish();
            },
            provide: f => EditorView.decorations.from(f),
        });

        const revealSelectedLines = StateField.define({
            create() {
                return Decoration.none;
            },
            update(decos, tr) {
                if (!(tr.selection || tr.docChanged || tr.focusChanged)) return decos;

                const sel = tr.state.selection;
                const b = new RangeSetBuilder();

                // If any non-empty selection exists, reveal all intersecting lines.
                const hasNonEmpty = sel.ranges.some(r => !r.empty);

                if (hasNonEmpty) {
                    for (const r of sel.ranges) {
                        let line = tr.state.doc.lineAt(r.from);
                        const endPos = r.to;
                        while (true) {
                            b.add(line.from, line.from, revealLineDeco);
                            if (line.to >= endPos) break;
                            if (line.number >= tr.state.doc.lines) break;
                            line = tr.state.doc.line(line.number + 1);
                        }
                    }
                } else {
                    // Empty selection(s): reveal just the caret line(s)
                    for (const r of sel.ranges) {
                        const line = tr.state.doc.lineAt(r.head);
                        b.add(line.from, line.from, revealLineDeco);
                    }
                }

                return b.finish();
            },
            provide: f => EditorView.decorations.from(f),
        });

        // Make sure we trigger recompute on viewport changes (when scrolling)
        const headingRenderView = ViewPlugin.fromClass(class {
            constructor(view) {
                this.view = view;
            }
            update(u) {
                if (u.viewportChanged) {
                    // Nudge the field to recompute by dispatching a no-op annotation
                    this.view.dispatch({ effects: [] });
                }
            }
        });

        // Custom theme for transparent background and active line styling
        const customTheme = EditorView.theme({
            '&': {
                backgroundColor: 'transparent',
                color: isDarkMode ? '#FFFFFF' : '#000000',
            },
            '.cm-content': {
                backgroundColor: 'transparent',
                color: isDarkMode ? '#FFFFFF' : '#000000',
            },
            '.cm-focused .cm-activeLine': {
                backgroundColor: 'transparent',
            },
            '.cm-activeLine': {
                backgroundColor: 'transparent',
            },
            '.cm-editor': {
                backgroundColor: 'transparent',
            },
            '.cm-scroller': {
                backgroundColor: 'transparent',
            },
            // Default cursor color
            '.cm-cursor': {
                borderLeftColor: isDarkMode ? '#FFFFFF' : '#000000',
            },
            '.cm-dropCursor': {
                borderLeftColor: isDarkMode ? '#FFFFFF' : '#000000',
            },
            // Style for markdoc rendered blocks
            '.cm-markdoc-renderBlock': {
                backgroundColor: 'transparent',
                color: isDarkMode ? '#FFFFFF' : '#000000',
            },
            // Style for hidden markdown syntax (no color override)
            '.cm-markdoc-hidden': {
                opacity: 0.35,
            },
            // Reveal ONLY within the active line(s) — do not set color here
            '.cm-line.cm-reveal-line .cm-markdoc-hidden, .cm-line.cm-reveal-line .cm-markdoc-hidden *': {
                display: 'inline !important',
                opacity: '1 !important',
                visibility: 'visible !important',
                filter: 'none !important',
                fontSize: 'inherit !important',
                lineHeight: 'inherit !important',
                transform: 'none !important',
                letterSpacing: 'normal !important',
                width: 'auto !important',
                height: 'auto !important',
                margin: '0 !important',
                padding: '0 !important',
                pointerEvents: 'none !important',   // ← key change: don't intercept clicks
            },
            // Render-like heading styles (scoped to the line) - avoid margins to prevent dead click areas
            '.cm-line.cm-renderlike-h1': {
                fontSize: '1.875rem',   // ~30px
                fontWeight: '700',
                lineHeight: '2.25rem',
                // avoid margin/padding left/right/top/bottom here
            },
            '.cm-line.cm-renderlike-h2': {
                fontSize: '1.5rem',
                fontWeight: '700',
                lineHeight: '2rem',
                // avoid margin/padding left/right/top/bottom here
            },
            '.cm-line.cm-renderlike-h3': {
                fontSize: '1.25rem',
                fontWeight: '600',
                lineHeight: '1.75rem',
                // avoid margin/padding left/right/top/bottom here
            },
            '.cm-line.cm-renderlike-h4': { 
                fontWeight: '600' 
            },
            '.cm-line.cm-renderlike-h5': { 
                fontWeight: '600' 
            },
            '.cm-line.cm-renderlike-h6': { 
                fontWeight: '600' 
            },
        });

        // Selection theme to make selections visible
        const selectionTheme = EditorView.theme({
            // Make sure the caret is still visible
            '.cm-content': {
                caretColor: isDarkMode ? '#FFFFFF' : '#000000',
            },

            /* Optional: keep selection matches visible too */
            '.cm-selectionMatch': {
                backgroundColor: isDarkMode
                    ? 'rgba(255,220,0,.15)'
                    : 'rgba(255,200,0,.18)',
            },
        }, { dark: isDarkMode });

        let exts = [
            // Use the rich editor plugin
            richEditor({
                markdoc: markdocConfig,
                lezer: {
                    codeLanguages: languages,
                    extensions: [Table]
                }
            }),
            customTheme,
            selectionTheme,
            headingRenderField,      // Heading render field for viewport-aware heading detection
            headingRenderView,       // View plugin for viewport change handling
            revealSelectedLines,     // Line decoration for selected lines only
            EditorView.lineWrapping,
            history(),
            drawSelection(),
            rectangularSelection(),
            highlightActiveLine(),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle),
            keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
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
}

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
