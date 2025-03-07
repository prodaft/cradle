import CodeMirror from '@uiw/react-codemirror';
import { vim } from '@replit/codemirror-vim';
import vimIcon from '../../assets/vim32x32.gif';
import { languages } from '@codemirror/language-data';
import { drawSelection } from '@uiw/react-codemirror';
import { useId, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import FileInput from '../FileInput/FileInput';
import FileTable from '../FileTable/FileTable';
import { NavArrowDown, NavArrowUp, LightBulb } from 'iconoir-react/regular';
import { treeView } from '@overleaf/codemirror-tree-view';
import { completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import { Prec } from '@uiw/react-codemirror';
import * as events from '@uiw/codemirror-extensions-events';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';
import { debounce } from 'lodash';
import { useTheme } from '../../contexts/ThemeContext/ThemeContext';
import { CradleEditor } from '../../utils/editorUtils/editorUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';

/**
 * This component makes use of a pre-existing code editor component (CodeMirror, see https://github.com/uiwjs/react-codemirror)
 * The Editor component is expected to be used for typing Markdown. It also has a toggle for enabling Vim mode in the editor.
 *
 * It also allows the user to upload files and view them in a table below the editor. These files have specific tags that can be copied to the clipboard.
 * By referencing these tags in the markdown content, the user can include the files in the note. A download link for that file will be generated in the preview.
 *
 * This component is reactive to the system theme. It uses the Eclipse theme for light mode and the VSCode Dark theme for dark mode.
 *
 * @function Editor
 * @param {Object} props - The props object
 * @param {string} props.markdownContent - the content inside the Editor
 * @param {StateSetter<string>} props.setMarkdownContent - callback used when the value of the content changes
 * @param {FileData} props.fileData - the files uploaded by the user. These belong to the note that is being written.
 * @param {StateSetter<FileData>} props.setFileData - callback used when the files change
 * @param {boolean} props.isDarkMode - the current theme of the editor
 * @returns {Editor}
 * @constructor
 */
export default function Editor({
    noteid,
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    viewCollapsed,
    setViewCollapsed,
    currentLine,
    setCurrentLine,
    setAlert,
    additionalExtensions = [],
}) {
    const EMPTY_FILE_LIST = new DataTransfer().files;
    const [enableVim, setEnableVim] = useState(
        localStorage.getItem('editor.vim') === 'true',
    );
    const [showFileList, setShowFileList] = useState(false);
    const [prevNoteId, setPrevNoteId] = useState(null);
    const [pendingFiles, setPendingFiles] = useState(EMPTY_FILE_LIST);
    const [lspLoaded, setLspLoaded] = useState(false);
    const [scrollMap, setScrollMap] = useState(null);
    const [top, setTop] = useState(0);
    const [codeMirrorContent, setCodeMirrorContent] = useState('');
    const { isDarkMode } = useTheme();
    const autoLinkId = useId();
    const vimModeId = useId();
    const editorRef = useRef(null);

    const debouncedSetCurrentLine = useRef(
        debounce((f) => {
            setCurrentLine(f());
        }, 50),
    ).current;

    const debouncedSetTop = useRef(
        debounce((val) => {
            setTop(val);
        }, 50),
    ).current;

    // Adjusted instantiation to pass an empty options object and the error handler
    const editorUtils = useMemo(
        () => {
          CradleEditor.clearCache()
          return new CradleEditor({}, setLspLoaded, displayError(setAlert))
        },
        [setAlert],
    );

    let extensions = [
        editorUtils.markdown({ codeLanguages: languages }),
        drawSelection(),
        EditorView.lineWrapping,
        editorUtils.autocomplete(),
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
        events.dom({
            paste(e) {
                if (e.clipboardData.files.length > 0) {
                    e.preventDefault();
                    setPendingFiles(e.clipboardData.files);
                }
            },
            click() {
                const state = editorRef.current.view.state;
                const cursor = state.selection.main.to;
                const line = state.doc.lineAt(cursor);
                debouncedSetCurrentLine(() => line.number);
            },
        }),
        events.scroll({
            scroll(e) {
                debouncedSetTop(e.target.scrollTop);
            },
        }),
        ...additionalExtensions,
    ];

    useEffect(() => {
        if (!editorRef.current || !editorRef.current.view) {
            return;
        }
        const view = editorRef.current.view;
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

        editorRef.current.view.dispatch({
            selection,
            scrollIntoView: true,
        });
    }, [currentLine]);

    if (enableVim) {
        extensions = extensions.concat(vim());
    }

    useEffect(() => {
        setShowFileList(!showFileList);
    }, []);

    const insertTextToCodeMirror = (text) => {
        if (editorRef.current) {
            const doc = editorRef.current.view.state;
            editorRef.current.view.dispatch(doc.replaceSelection(text));
        }
    };

    useEffect(() => {
        setCodeMirrorContent(markdownContent);
    }, [isDarkMode]);

    // Create a debounced function (adjust wait time as needed).
    const debouncedSetMarkdownContent = useRef(
        debounce((text) => {
            setMarkdownContent(text);
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

    const toggleFileList = () => {
        setShowFileList(!showFileList);
    };

    const smartLink = () => {
        if (!editorRef.current) {
            return;
        }
        const doc = editorRef.current.view.state;
        let to = doc.selection.main.to;
        let from = doc.selection.main.from;
        let content = markdownContent;

        if (to === from) {
            from = 0;
            to = content.length;
        }

        const linked = editorUtils.autoFormatLinks(editorRef.current.view, from, to);
        setMarkdownContent(linked);
        editorRef.current.view.dispatch({
            from: 0,
            to: content.length,
            changes: { from: 0, to: content.length, insert: linked },
        });
    };

    return (
        <div className='h-full w-full flex flex-col flex-1'>
            <div className='h-full w-full flex flex-col overflow-auto'>
                <div className='flex flex-row justify-between p-2'>
                    <span className='max-w-[55%] flex flex-row space-x-3 items-center'>
                        <FileInput
                            fileData={fileData}
                            setFileData={setFileData}
                            pendingFiles={pendingFiles}
                            setPendingFiles={setPendingFiles}
                        />
                        {lspLoaded && (
                            <button
                                id={autoLinkId}
                                data-testid='auto-link'
                                name='auto-link'
                                type='button'
                                className='flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary'
                                data-tooltip={'Auto Link'}
                                onClick={smartLink}
                            >
                                <LightBulb />
                            </button>
                        )}
                    </span>
                    <span className='flex flex-row space-x-3 items-center'>
                        <label
                            htmlFor={vimModeId}
                            className='flex flex-row items-center cursor-pointer'
                        >
                            <img src={vimIcon} alt='' style={{ width: '25px' }} />
                        </label>
                        <input
                            id={vimModeId}
                            data-testid='vim-toggle'
                            name='vim-toggle'
                            type='checkbox'
                            className='switch switch-ghost-primary my-1'
                            checked={enableVim}
                            onChange={() => {
                                localStorage.setItem('editor.vim', !enableVim);
                                setEnableVim(!enableVim);
                            }}
                        />
                        <button
                            id={autoLinkId}
                            data-testid='toggle-preview'
                            name='toggle-preview'
                            type='button'
                            className='flex flex-row items-center hover:bg-gray-4 tooltip tooltip-left tooltip-primary'
                            data-tooltip={
                                viewCollapsed ? 'Show Preview' : 'Hide Preview'
                            }
                            onClick={() => setViewCollapsed(!viewCollapsed)}
                        >
                            {!viewCollapsed ? <NavArrowRight /> : <NavArrowLeft />}
                        </button>
                    </span>
                </div>
                <div className='overflow-hidden w-full rounded-lg'>
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
