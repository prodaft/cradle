import CodeMirror from '@uiw/react-codemirror';
import { vim } from '@replit/codemirror-vim';
import vimIcon from '../../assets/vim32x32.gif';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { drawSelection } from '@uiw/react-codemirror';
import { useId, useState, useRef, useCallback, useEffect } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import FileInput from '../FileInput/FileInput';
import FileTable from '../FileTable/FileTable';
import { NavArrowDown, NavArrowUp, LightBulb } from 'iconoir-react/regular';
import { fetchLspPack } from '../../services/queryService/queryService';
import { completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import { getLinkNode, parseLink } from '../../utils/textEditorUtils/textEditorUtils';
import { Prec } from '@uiw/react-codemirror';
import * as events from '@uiw/codemirror-extensions-events';
import { NavArrowLeft, NavArrowRight } from 'iconoir-react';
import { debounce } from 'lodash'; // or any debounce package

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
 * @param {boolean} props.isLightMode - the current theme of the editor
 * @returns {Editor}
 * @constructor
 */
export default function Editor({
    markdownContent,
    setMarkdownContent,
    fileData,
    setFileData,
    viewCollapsed,
    setViewCollapsed,
    isLightMode,
}) {
    const EMPTY_FILE_LIST = new DataTransfer().files;
    const [enableVim, setEnableVim] = useState(
        localStorage.getItem('editor.vim') === 'true',
    );
    const [showFileList, setShowFileList] = useState(false);
    const [lspPack, setLspPack] = useState({ classes: {}, instances: {} });
    const [pendingFiles, setPendingFiles] = useState(EMPTY_FILE_LIST);
    const autoLinkId = useId();
    const vimModeId = useId();
    const editorRef = useRef(null);

    const suggestionsForWord = (word) => {
        let suggestions = [];

        // Check each class type in LspPack
        for (const [type, criteria] of Object.entries(lspPack.classes)) {
            // Check if criteria has a regex
            if (criteria.regex) {
                const regex = new RegExp(`^${criteria.regex}$`);
                if (regex.test(word) || regex.test(word.toLowerCase())) {
                    suggestions.push({
                        type: type,
                        match: word,
                    });
                }
            }

            // Check if criteria has an enum
            if (criteria.enum) {
                const matchingEnums = criteria.enum.filter((value) =>
                    value.toLowerCase().startsWith(word.toLowerCase()),
                );
                matchingEnums.forEach((match) => {
                    suggestions.push({
                        type: type,
                        match: match,
                    });
                });
            }
        }

        // Check in instances for possible completions
        for (const [type, instances] of Object.entries(lspPack.instances)) {
            const matchingInstances = instances.filter((value) =>
                value.startsWith(word),
            );
            matchingInstances.forEach((match) => {
                suggestions.push({
                    type: type,
                    match: match,
                });
            });
        }

        return suggestions;
    };

    const autocompleteOutsideLink = (context) => {
        let word = context.matchBefore(/\S*/);
        if (word.from == word.to && !context.explicit)
            return { from: context.pos, options: [] };

        return new Promise((resolve) => {
            let suggestions = suggestionsForWord(word.text).map((o) => {
                return { type: 'keyword', label: `[[${o.type}:${o.match}]]` };
            });
            resolve({
                from: word.from,
                to: word.to,
                options: suggestions,
            });
        });
    };

    // Autocomplete links (e.g. syntax `[[...]]`) using information from the database. Uses the `/query` endpoint to get the data.
    const linkAutoComplete = (context) => {
        let node = getLinkNode(context);

        if (node == null) return autocompleteOutsideLink(context);

        const linkFull = context.state.sliceDoc(node.from, node.to);
        const parsedLink = parseLink(node.from, context.pos, linkFull);

        if (parsedLink == null) return { from: context.pos, options: [] };

        let options = new Promise((f) => f([]));

        if (parsedLink.type == null) {
            options = new Promise((f) =>
                f(
                    Object.values(lspPack)
                        .flatMap((obj) => Object.keys(obj))
                        .map((item) => ({
                            label: parsedLink.post(item),
                            type: 'keyword',
                        })),
                ),
            );
        } else if (parsedLink.type in lspPack['instances']) {
            options = new Promise((f) =>
                f(
                    lspPack['instances'][parsedLink.type].map((item) => ({
                        label: parsedLink.post(item),
                        type: 'keyword',
                    })),
                ),
            );
        }

        return options.then((o) => {
            return {
                from: parsedLink.from,
                to: parsedLink.to,
                options: o,
            };
        });
    };

    const autoCompleteConfig = markdownLanguage.data.of({
        autocomplete: linkAutoComplete,
    });

    var extensions = [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        drawSelection(),
        EditorView.lineWrapping,
        autoCompleteConfig,
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
        }),
    ];

    if (enableVim) {
        // This editor also has the option to be used in vim mode, which can be toggled.
        // https://codemirror.net/5/demo/vim.html
        extensions = extensions.concat(vim());
    }

    const toggleFileList = useCallback(() => {
        setShowFileList(!showFileList);
    }, [showFileList]);

    const insertTextToCodeMirror = (text) => {
        if (editorRef.current) {
            const doc = editorRef.current.view.state;
            editorRef.current.view.dispatch(doc.replaceSelection(text));
        }
    };

    const autoFormatLinks = () => {
        if (!editorRef.current) {
            return;
        }
        const doc = editorRef.current.view.state;
        let to = doc.selection.main.to;
        let from = doc.selection.main.from;
        let content;

        if (to == from) {
            content = markdownContent;
            from = 0;
            to = content.length;
        } else {
            content = doc.sliceDoc(from, to);
        }

        console.log(from, to, content);

        const words = content.split(/(\s+)/);

        const trim_word = (x) => {
            return x.replace(/^[,.:\s]+|[,.:\s]+$/g, '');
        };
        let linkedMarkdown = content;

        let position = 0;

        words.forEach((word) => {
            if (trim_word(word)) {
                const start = position;
                const end = start + word.length;
                let suggestions = suggestionsForWord(trim_word(word));

                suggestions = suggestions.filter(
                    (x) => trim_word(x.match) == trim_word(word),
                );
                if (suggestions && suggestions.length >= 1) {
                    let link = `[[${suggestions[0].type}:${suggestions[0].match}]]`;
                    linkedMarkdown =
                        linkedMarkdown.substring(0, start) +
                        link +
                        linkedMarkdown.substring(end);
                    position += link.length - word.length;
                }
            }

            position += word.length;
        });

        setMarkdownContent(
            markdownContent.substring(0, from) +
                linkedMarkdown +
                markdownContent.substring(to),
        );
    };

    // Create a debounced function (adjust wait time as needed).
    const debouncedSetMarkdownContent = useRef(
        debounce((text) => {
            setMarkdownContent(text);
        }, 300),
    ).current;

    const onEditorChange = useCallback(
        (text) => {
            // Instead of calling setMarkdownContent directly, use the debounced function
            debouncedSetMarkdownContent(text);
        },
        [debouncedSetMarkdownContent],
    );

    useEffect(() => {
        fetchLspPack()
            .then((response) => {
                setLspPack(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

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
                        <button
                            id={autoLinkId}
                            data-testid='auto-link'
                            name='auto-link'
                            type='button'
                            className='flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary'
                            data-tooltip={'Auto Link'}
                            onClick={autoFormatLinks}
                        >
                            <LightBulb />
                        </button>
                    </span>
                    <span className='flex flex-row space-x-3 items-center'>
                        <label
                            htmlFor={vimModeId}
                            className='flex flex-row items-center cursor-pointer'
                        >
                            <img
                                src={vimIcon}
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
                        data-testid='markdown-input'
                        theme={isLightMode ? eclipse : vscodeDark}
                        height='100%'
                        extensions={extensions}
                        className='w-full h-full resize-none'
                        onChange={onEditorChange}
                        value={markdownContent}
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
