import { acceptCompletion, autocompletion, closeBrackets, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { defaultHighlightStyle, indentOnInput, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { forEachDiagnostic } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, drawSelection, highlightActiveLine, keymap, rectangularSelection } from '@codemirror/view';
import { Prec } from '@uiw/react-codemirror';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import { debounce } from 'lodash';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getEntryClasses } from '../../services/adminService/adminService';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import FileTable from '../FileTable/FileTable';

import { purrmd, purrmdTheme } from 'purrmd';

// Widget to render Cradle links as clickable elements
class CradleLinkWidget extends WidgetType {
    constructor(type, name, alias, color, navigate, fullText, timestamp, hasPrefix) {
        super();
        this.type = type;
        this.name = name;
        this.alias = alias;
        this.color = color;
        this.navigate = navigate;
        this.fullText = fullText;
        this.timestamp = timestamp;
        this.hasPrefix = hasPrefix;
    }

    eq(other) {
        return other.type === this.type &&
            other.name === this.name &&
            other.alias === this.alias &&
            other.color === this.color &&
            other.timestamp === this.timestamp &&
            other.hasPrefix === this.hasPrefix;
    }

    toDOM(view) {
        const container = document.createElement('span');
        container.style.display = 'inline';
        container.className = 'cradle-link-widget-container';

        // Main link span
        const linkSpan = document.createElement('span');
        const displayName = this.alias || this.name;
        const url = `/dashboards/${encodeURIComponent(this.type)}/${encodeURIComponent(this.name)}/`;

        linkSpan.textContent = displayName;
        linkSpan.style.color = this.color || '#FF8C00';
        linkSpan.style.cursor = 'pointer';
        linkSpan.style.textDecoration = 'underline';
        linkSpan.style.display = 'inline';
        linkSpan.setAttribute('data-link-url', url);
        linkSpan.setAttribute('data-link-full-text', this.fullText);
        linkSpan.className = 'cradle-link-widget';

        linkSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only navigate on Ctrl+Click (or Cmd+Click on Mac)
            if (e.ctrlKey || e.metaKey) {
                this.navigate(url);
            }
        });

        linkSpan.addEventListener('mouseenter', () => {
            linkSpan.style.opacity = '0.8';
        });

        linkSpan.addEventListener('mouseleave', () => {
            linkSpan.style.opacity = '1';
        });

        container.appendChild(linkSpan);

        // Add timestamp if present
        if (this.timestamp) {
            const timestampSpan = document.createElement('span');
            timestampSpan.textContent = this.timestamp;
            timestampSpan.style.color = this.color || '#FF8C00';
            timestampSpan.style.fontSize = '0.85em';
            timestampSpan.style.fontStyle = 'italic';
            timestampSpan.style.opacity = '0.7';
            timestampSpan.style.marginLeft = '4px';
            timestampSpan.style.textDecoration = 'underline';
            timestampSpan.style.display = 'inline';
            timestampSpan.className = 'cradle-link-timestamp';
            container.appendChild(timestampSpan);
        }

        return container;
    }

    ignoreEvent(e) {
        // Return true for mousedown to allow the editor to handle cursor placement
        return e.type === 'mousedown';
    }
}

// Create ViewPlugin to render CradleLink nodes as widgets
function cradleLinksPlugin(entryColors, navigate) {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.entryColors = entryColors;
            this.navigate = navigate;
            this.decorations = this.buildDecorations(view);
        }

        update(update) {
            // Count diagnostics to detect changes
            let oldDiagnosticCount = 0;
            forEachDiagnostic(update.startState, () => { oldDiagnosticCount++; });

            let newDiagnosticCount = 0;
            forEachDiagnostic(update.state, () => { newDiagnosticCount++; });

            const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

            if (update.docChanged || update.viewportChanged || update.selectionSet || diagnosticsChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view) {
            const widgets = [];
            const doc = view.state.doc;
            const text = doc.toString();
            const selection = view.state.selection.main;
            const cursorPos = selection.head;
            const tree = syntaxTree(view.state);

            // Collect lint diagnostics to check if links have errors/warnings
            const diagnostics = [];
            forEachDiagnostic(view.state, (diagnostic) => {
                diagnostics.push(diagnostic);
            });

            // Iterate through the syntax tree to find CradleLink nodes
            tree.iterate({
                enter: (node) => {
                    if (node.type.name === 'CradleLink') {
                        const from = node.from;
                        const to = node.to;

                        // Extract the link parts and check for timestamp
                        const linkText = text.slice(from, to);
                        let hasPrefix = false;
                        let type = '';
                        let name = '';
                        let alias = '';
                        let timestamp = '';
                        let widgetEnd = to;
                        let timestampFrom = to;
                        let timestampTo = to;

                        // Parse child nodes
                        let child = node.node.firstChild;
                        while (child) {
                            const childText = text.slice(child.from, child.to);
                            if (child.type.name === 'CradleLinkPrefix') {
                                hasPrefix = true;
                            } else if (child.type.name === 'CradleLinkType') {
                                type = childText;
                            } else if (child.type.name === 'CradleLinkValue') {
                                name = childText;
                            } else if (child.type.name === 'CradleLinkAlias') {
                                alias = childText;
                            } else if (child.type.name === 'CradleLinkTimestamp') {
                                timestamp = childText;
                                timestampFrom = child.from;
                                timestampTo = child.to;
                                widgetEnd = child.to;
                            }
                            child = child.nextSibling;
                        }

                        // Don't render widget if cursor is inside or on the border of the link OR timestamp
                        if ((cursorPos >= from && cursorPos <= to) ||
                            (timestamp && cursorPos >= timestampFrom && cursorPos <= timestampTo)) {
                            return;
                        }

                        // Don't render widget if the link is empty (no type or name)
                        if (!type && !name) {
                            return;
                        }

                        // Check if there are any diagnostics overlapping with this link
                        const hasLintIssues = diagnostics.some(diagnostic => {
                            // Check if diagnostic overlaps with the link range
                            return (diagnostic.from < widgetEnd && diagnostic.to > from);
                        });

                        // Don't collapse the link if it has lint issues - show the raw text instead
                        if (hasLintIssues) {
                            return;
                        }

                        const color = this.entryColors.get(type);

                        widgets.push(
                            Decoration.replace({
                                widget: new CradleLinkWidget(type, name, alias, color, this.navigate, linkText, timestamp, hasPrefix),
                                inclusive: false,
                                block: false,
                            }).range(from, widgetEnd)
                        );
                    }
                }
            });

            return Decoration.set(widgets, true);
        }
    }, {
        decorations: v => v.decorations
    });
}

// Create ViewPlugin to style CradleLink text when uncollapsed (cursor inside or has lint issues)
function cradleLinkColorPlugin(entryColors) {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.entryColors = entryColors;
            this.decorations = this.buildDecorations(view);
        }

        update(update) {
            // Count diagnostics to detect changes
            let oldDiagnosticCount = 0;
            forEachDiagnostic(update.startState, () => { oldDiagnosticCount++; });

            let newDiagnosticCount = 0;
            forEachDiagnostic(update.state, () => { newDiagnosticCount++; });

            const diagnosticsChanged = oldDiagnosticCount !== newDiagnosticCount;

            if (update.docChanged || update.viewportChanged || update.selectionSet || diagnosticsChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        buildDecorations(view) {
            const marks = [];
            const doc = view.state.doc;
            const text = doc.toString();
            const selection = view.state.selection.main;
            const cursorPos = selection.head;
            const tree = syntaxTree(view.state);

            // Collect lint diagnostics
            const diagnostics = [];
            forEachDiagnostic(view.state, (diagnostic) => {
                diagnostics.push(diagnostic);
            });

            // Find CradleLink nodes where cursor is inside OR has lint issues
            tree.iterate({
                enter: (node) => {
                    if (node.type.name === 'CradleLink') {
                        const from = node.from;
                        const to = node.to;

                        let type = '';
                        let linkEnd = to;
                        let timestampFrom = to;
                        let timestampTo = to;
                        let hasPrefix = false;
                        let child = node.node.firstChild;

                        // Find the type to get its color and detect timestamp and prefix
                        while (child) {
                            if (child.type.name === 'CradleLinkPrefix') {
                                hasPrefix = true;
                            } else if (child.type.name === 'CradleLinkType') {
                                type = text.slice(child.from, child.to);
                            } else if (child.type.name === 'CradleLinkTimestamp') {
                                // Extend link range to include timestamp
                                timestampFrom = child.from;
                                timestampTo = child.to;
                                linkEnd = child.to;
                            }
                            child = child.nextSibling;
                        }

                        // Check if cursor is inside the link OR inside the timestamp
                        const isInLink = cursorPos >= from && cursorPos <= to;
                        const isInTimestamp = linkEnd > to && cursorPos >= timestampFrom && cursorPos <= timestampTo;

                        // Check if there are any diagnostics overlapping with this link
                        const hasLintIssues = diagnostics.some(diagnostic => {
                            return (diagnostic.from < linkEnd && diagnostic.to > from);
                        });

                        // Style if cursor IS inside OR if link has lint issues
                        if (isInLink || isInTimestamp || hasLintIssues) {
                            // Don't apply special styling if the link is empty (no type)
                            if (!type) {
                                return;
                            }

                            const color = this.entryColors.get(type) || '#FF8C00';

                            // Color the entire link including brackets and timestamp in the entry class color
                            // Use !important to ensure it overrides other styles
                            marks.push(
                                Decoration.mark({
                                    attributes: {
                                        style: `color: ${color} !important;`
                                    }
                                }).range(from, linkEnd)
                            );

                            // Apply additional styling to specific parts (on top of base color)
                            child = node.node.firstChild;
                            while (child) {
                                if (child.type.name === 'CradleLinkPrefix' && child.from !== child.to) {
                                    // Prefix (~) - style with color and opacity
                                    marks.push(
                                        Decoration.mark({
                                            attributes: { style: `color: ${color} !important; opacity: 0.8; font-weight: 600;` }
                                        }).range(child.from, child.to)
                                    );
                                } else if (child.type.name === 'CradleLinkType' && child.from !== child.to) {
                                    // Type part - explicitly set color to override syntax highlighting
                                    marks.push(
                                        Decoration.mark({
                                            attributes: { style: `color: ${color} !important; opacity: 0.9;` }
                                        }).range(child.from, child.to)
                                    );
                                } else if (child.type.name === 'CradleLinkValue' && child.from !== child.to) {
                                    // Value is bold with explicit color
                                    marks.push(
                                        Decoration.mark({
                                            attributes: { style: `color: ${color} !important; font-weight: 600;` }
                                        }).range(child.from, child.to)
                                    );
                                } else if (child.type.name === 'CradleLinkAlias' && child.from !== child.to) {
                                    // Alias is italic with explicit color
                                    marks.push(
                                        Decoration.mark({
                                            attributes: { style: `color: ${color} !important; font-style: italic;` }
                                        }).range(child.from, child.to)
                                    );
                                } else if (child.type.name === 'CradleLinkTimestamp' && child.from !== child.to) {
                                    // Timestamp is italic with opacity and underlined
                                    marks.push(
                                        Decoration.mark({
                                            attributes: { style: `color: ${color} !important; font-style: italic; opacity: 0.7; text-decoration: underline; font-size: 0.85em;` }
                                        }).range(child.from, child.to)
                                    );
                                }
                                child = child.nextSibling;
                            }
                        }
                    }
                }
            });

            return Decoration.set(marks, true);
        }
    }, {
        decorations: v => v.decorations
    });
}

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
    const { navigate } = useCradleNavigate();
    const editorRef = useRef(null);
    const editorViewRef = useRef(null);
    const markdownContentRef = useRef(markdownContent);
    const currentLineRef = useRef(currentLine);
    const [entryColors, setEntryColors] = useState(new Map());

    // Fetch entry colors on mount
    useEffect(() => {
        const fetchEntryColors = async () => {
            try {
                const response = await getEntryClasses();
                if (response.status === 200) {
                    const colorMap = new Map();
                    for (const entry of response.data) {
                        colorMap.set(entry.subtype, entry.color);
                    }
                    setEntryColors(colorMap);
                }
            } catch (error) {
                console.error('Failed to fetch entry colors:', error);
            }
        };
        fetchEntryColors();
    }, []);

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
    // Use a getter to always return the current value
    useImperativeHandle(ref, () => ({
        get view() {
            return editorViewRef.current;
        },
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
        // Don't initialize extensions until we have entry colors
        if (entryColors.size === 0) {
            return [];
        }

        let exts = [
            cradleTheme,
            // Add Cradle links rendering plugin (shows widget when cursor outside)
            cradleLinksPlugin(entryColors, navigate),
            // Add Cradle link color plugin (styles text when cursor inside)
            cradleLinkColorPlugin(entryColors),
            // Use PurrMD with Cradle link extension to prevent [[...]] being parsed as regular links
            purrmd({
                markdownExtConfig: {
                    extensions: [editorUtils.extension()]
                }
            }),
            purrmdTheme(),
            // Other extensions
            EditorView.lineWrapping,
            history(),
            drawSelection(),
            rectangularSelection(),
            highlightActiveLine(),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle),
            closeBrackets(),
            // Add autocomplete with proper keybindings
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
        entryColors,
        navigate,
    ]);

    // Initialize the editor when the component mounts and extensions are ready
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
    }, [extensions, setMarkdownContent, setAlert, markdownContent]);

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
