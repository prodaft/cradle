import useLocalStorageMarkdown from "../../hooks/useMarkdownContent/useMarkdownContent.js";
import Editor from "../Editor/Editor";
import Preview from "../Preview/Preview";
import { Upload, FloppyDisk } from "iconoir-react/regular";
import { saveNote } from '../../services/textEditorService/textEditorService.js';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils.js'

/**
 * The text editor is composed of two sub-components, the Editor and the Preview. View their documentation for more details
 * 
 * @returns TextEditor
 */
export default function TextEditor() {
    const [markdownContent, setMarkdownContentCallback] = useLocalStorageMarkdown();
    const parsedContent = parseContent(markdownContent);

    return (
        <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 bg-cradle1 overflow-y-hidden">
            <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContentCallback} />
            <Preview htmlContent={parsedContent} /> 
        </div>
    )
}