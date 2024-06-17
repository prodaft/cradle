import CodeMirror from '@uiw/react-codemirror';
import { vim } from '@replit/codemirror-vim';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { drawSelection } from '@uiw/react-codemirror';
import { useId, useState, useRef, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import FileInput from '../FileInput/FileInput';
import FileTable from '../FileTable/FileTable';
import { NavArrowDown, NavArrowUp } from 'iconoir-react/regular';

/**
 * This component makes use of a pre-existing code editor component (CodeMirror, see https://github.com/uiwjs/react-codemirror)
 * The Editor component is expected to be used for typing Markdown. It also has a toggle for enabling Vim mode in the editor.
 *
 * It also allows the user to upload files and view them in a table below the editor. These files have specific tags that can be copied to the clipboard.
 * By referencing these tags in the markdown content, the user can include the files in the note. A download link for that file will be generated in the preview.
 *
 * This component is reactive to the system theme. It uses the Eclipse theme for light mode and the VSCode Dark theme for dark mode.
 *
 * @param {string} markdownContent - the content inside the Editor
 * @param {(string) => void} setMarkdownContent - callback used when the value of the content changes
 * @param {Array<{minio_file_name: string, name: string, bucket_name: string}>} fileData - the files uploaded by the user. These belong to the note that is being written.
 *                                   Each piece of fiele data consists of the `tag` and the `name` of the file
 * @param {(Array<{minio_file_name: string, name: string, bucket_name: string}>) => void} setFileData - callback used when the files change
 * @param {boolean} isLightMode - the current theme of the editor
 * @returns {Editor}
 */
export default function Editor({
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    isLightMode,
}) {
    const [enableVim, setEnableVim] = useState(false);
    const [showFileList, setShowFileList] = useState(false);
    const vimModeId = useId();
    const editorRef = useRef(null);

    // Set extension here
    var extensions = [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        drawSelection(),
        EditorView.lineWrapping,
    ];

    if (enableVim) {
        // This editor also has the option to be used in vim mode, which can be toggled.
        // https://codemirror.net/5/demo/vim.html
        extensions = extensions.concat(vim());
    }

    const toggleFileList = useCallback(() => {
        setShowFileList(!showFileList);
    }, [showFileList]);

    return (
        <div className='h-full w-full flex flex-col flex-1'>
            <div className='h-full w-full flex flex-col overflow-auto'>
                <div className='flex flex-row justify-between p-2'>
                    <span className='max-w-[55%]'>
                        <FileInput fileData={fileData} setFileData={setFileData} />
                    </span>
                    <span className='flex flex-row space-x-2 items-center'>
                        <label
                            htmlFor={vimModeId}
                            className='flex flex-row items-center cursor-pointer'
                        >
                            <img
                                src='https://www.vim.org/images/vim32x32.gif'
                                alt=''
                                style={{ width: '25px' }}
                            />
                        </label>
                        <input
                            id={vimModeId}
                            data-testid='vim-toggle'
                            name='vim-toggle'
                            type='checkbox'
                            className='switch switch-ghost-primary my-1'
                            checked={enableVim}
                            onChange={() => setEnableVim(!enableVim)}
                        />
                    </span>
                </div>
                <div className='overflow-hidden w-full rounded-lg'>
                    <CodeMirror
                        name='markdown-input'
                        id='markdown-input'
                        data-testid='markdown-input'
                        theme={isLightMode ? eclipse : vscodeDark}
                        height='100%'
                        extensions={extensions}
                        className='w-full h-full resize-none'
                        onChange={setMarkdownContent}
                        value={markdownContent}
                        ref={editorRef}
                    />
                </div>
            </div>
            {fileData && fileData.length > 0 && (
                <div className='max-h-[25%] rounded-md flex flex-col justify-end z-30'>
                    <div
                        className='bg-gray-3 text-zinc-200 px-4 py-[2px] my-1 rounded-md hover:cursor-pointer flex flex-row space-x-2'
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
                            <FileTable fileData={fileData} setFileData={setFileData} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
