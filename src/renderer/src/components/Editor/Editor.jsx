import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

/**
 * This component makes use of a pre-existing code editor component (CodeMirror, see https://github.com/uiwjs/react-codemirror)
 * The Editor component is expected to be used for typing Markdown
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
        </div>
    )
}

