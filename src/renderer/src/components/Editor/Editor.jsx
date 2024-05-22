import CodeMirror from "@uiw/react-codemirror";
<<<<<<< HEAD
import { vim } from "@replit/codemirror-vim";
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { drawSelection } from "@uiw/react-codemirror";
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useState } from "react";
import { EditorView } from '@codemirror/view';
=======
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
>>>>>>> main

/**
 * This component makes use of a pre-existing code editor component (CodeMirror, see https://github.com/uiwjs/react-codemirror)
 * The Editor component is expected to be used for typing Markdown
<<<<<<< HEAD
 *
 * @param {string} markdownContent - the content inside the Editor
 * @param {(string) => void} setMarkdownContent - callback used when the value of the content changes
 * @returns {Editor}
 */
export default function Editor({ markdownContent, setMarkdownContent }) {
    const [enableVim, setEnableVim] = useState(false);

    // Set extension here
    var extensions = [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        drawSelection(),
        EditorView.lineWrapping,
    ]

    if (enableVim) {
        // This editor also has the option to be used in vim mode, which can be toggled.
        // https://codemirror.net/5/demo/vim.html
        extensions = extensions.concat(vim())
    }

    return (
        <div className="h-1/2 sm:h-full w-full flex flex-col ">
            <div className="flex flex-row justify-between items-center p-2">
                <label htmlFor="vim-toggle" className="flex items-center cursor-pointer">
                    Vim Mode:
                </label>
                <input
                    data-testid="vim-toggle"
                    name="vim-toggle"
                    type="checkbox"
                    className="switch switch-ghost-primary my-1"
                    checked={enableVim}
                    onChange={() => setEnableVim(!enableVim)}
                />
            </div>
            <div className="flex-grow overflow-hidden rounded-lg">
                <CodeMirror
                    name="markdown-input"
                    id="markdown-input"
                    data-testid="markdown-input"
                    theme={vscodeDark}
                    height="100%"
                    extensions={extensions}
                    className="w-full h-full resize-none"
                    onChange={setMarkdownContent}
                    value={markdownContent}
                />
            </div>
=======
 * 
 * @param {string} markdownContent - the content inside the Editor
 * @param {(string) => void} setMarkdownContent - callback used when the value of the content changes
 * @returns Editor
 */
export default function Editor({ markdownContent, setMarkdownContent }) {
    return (
        <div className="h-full overflow-hidden rounded-lg w-full">
            <CodeMirror 
                name="markdown-input"   
                id="markdown-input" 
                data-testid="markdown-input"
                theme={vscodeDark}
                height="100%"
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                className="w-full h-full bg-cradle3 resize-none"
                onChange={setMarkdownContent} 
                value={markdownContent}
            />
>>>>>>> main
        </div>
    )
}

