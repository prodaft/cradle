import { acceptCompletion, completionKeymap } from '@codemirror/autocomplete';
import { languages } from '@codemirror/language-data';
import { EditorView, keymap } from '@codemirror/view';
import { vim, Vim } from '@replit/codemirror-vim';
import * as events from '@uiw/codemirror-extensions-events';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror, { drawSelection, Prec } from '@uiw/react-codemirror';
import { debounce } from 'lodash';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';

/**
 * Source code editor component using CodeMirror for raw Markdown editing.
 * This component provides a plain text editing experience with syntax highlighting.
 * It is reactive to the system theme (Eclipse for light mode, VSCode Dark for dark mode).
 *
 * @function Editor
 * @param {Object} props - The props object
 * @param {string} props.noteid - the ID of the current note
 * @param {string} props.markdownContent - the content inside the Editor
 * @param {function} props.setMarkdownContent - callback used when the value of the content changes
 * @param {Array} props.fileData - the files uploaded by the user
 * @param {function} props.setFileData - callback used when the files change
 * @param {function} props.setAlert - callback to display alerts
 * @param {function} props.saveNote - callback to save the note
 * @param {Array} props.additionalExtensions - additional CodeMirror extensions
 * @param {React.Ref} ref - Reference to expose editor internals
 * @returns {JSX.Element}
 */
const Editor = forwardRef(function Editor({
    noteid,
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    setAlert,
    saveNote,
    additionalExtensions = [],
}, ref) {
    const { profile } = useProfile();
    const [prevNoteId, setPrevNoteId] = useState(null);
    const [lspLoaded, setLspLoaded] = useState(false);
    const [codeMirrorContent, setCodeMirrorContent] = useState('');
    const { isDarkMode } = useTheme();
    const editorRef = useRef(null);
    const markdownContentRef = useRef(markdownContent);

    // Expose editor ref to parent
    useImperativeHandle(ref, () => editorRef.current, []);

    // Update refs when props change to avoid using stale values in callbacks
    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    // Adjusted instantiation to pass an empty options object and the error handler
    const editorUtils = useMemo(() => {
        CradleEditor.clearCache();
        return new CradleEditor({}, setLspLoaded, displayError(setAlert));
    }, [setAlert]);

    const extensions = useMemo(() => {
        let exts = [
            editorUtils.markdown({ codeLanguages: languages }),
            drawSelection(),
            EditorView.lineWrapping,
            ...editorUtils.autocomplete(),
            editorUtils.lint(),
            Prec.highest(
                keymap.of([
                    ...completionKeymap,
                    {
                        key: 'Tab',
                        run: acceptCompletion,
                    },
                ]),
            ),
            ...additionalExtensions,
        ];

        if (profile?.vim_mode) {
            Vim.defineEx('write', 'w', (cm) => {
                saveNote();
            });
            exts = exts.concat(vim());
        }

        return exts;
    }, [
        editorUtils,
        profile?.vim_mode,
        additionalExtensions,
        saveNote,
    ]);

    useEffect(() => {
        setCodeMirrorContent(markdownContent);
    }, [isDarkMode]);

    // Create a debounced function for setting markdown content
    const debouncedSetMarkdownContent = useRef(
        debounce((text) => {
            // Only update if content has actually changed
            if (markdownContentRef.current !== text) {
                setMarkdownContent(text);
            }
        }, 100),
    ).current;

    const onEditorChange = useCallback(
        (text) => {
            debouncedSetMarkdownContent(text);
        },
        [debouncedSetMarkdownContent],
    );

    useEffect(() => {
        if (prevNoteId != null && prevNoteId !== 'new' && codeMirrorContent !== '') {
            setMarkdownContent('');
            setCodeMirrorContent('');
        }
        setPrevNoteId(noteid);
    }, [noteid]);

    useEffect(() => {
        if (codeMirrorContent === '') {
            setCodeMirrorContent(markdownContent);
        }
    }, [markdownContent]);

    return (
        <div className='h-full w-full flex flex-col flex-1'>
            <div className='h-full w-full flex flex-col overflow-auto'>
                <div className='flex h-full overflow-y-hidden'>
                    <div className='w-full overflow-y-auto rounded-lg'>
                        <CodeMirror
                            name='markdown-input'
                            id='markdown-input'
                            key='markdown-input'
                            value={codeMirrorContent}
                            data-testid='markdown-input'
                            theme={isDarkMode ? vscodeDark : eclipse}
                            height='100%'
                            extensions={extensions}
                            className='w-full h-full resize-none CodeMirror'
                            onChange={onEditorChange}
                            ref={editorRef}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

// Use memo to prevent unnecessary re-renders when props haven't meaningfully changed
export default memo(Editor, (prevProps, nextProps) => {
    // Only re-render if these specific props have changed
    return (
        prevProps.noteid === nextProps.noteid &&
        prevProps.markdownContent === nextProps.markdownContent &&
        prevProps.fileData === nextProps.fileData &&
        prevProps.saveNote === nextProps.saveNote &&
        prevProps.additionalExtensions === nextProps.additionalExtensions
    );
});
