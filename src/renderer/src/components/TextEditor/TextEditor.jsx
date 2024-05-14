import useLocalStorageMarkdown from "../../hooks/useMarkdownContent/useMarkdownContent.js";
import Editor from "../Editor/Editor";
import Preview from "../Preview/Preview";
import { Upload, FloppyDisk } from "iconoir-react/regular";
import { saveNote } from '../../services/textEditorService/textEditorService.js';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils.js'
import {useOutletContext} from "react-router-dom";
import NavbarItem from "../NavbarItem/NavbarItem";
import {useEffect} from "react";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";

/**
 * The text editor is composed of two sub-components, the Editor and the Preview. View their documentation for more details
 * 
 * @returns TextEditor
 */
export default function TextEditor() {
    const [markdownContent, setMarkdownContentCallback] = useLocalStorageMarkdown();
    const parsedContent = parseContent(markdownContent);
    useNavbarContents(
        [<NavbarItem icon={<Upload />} text="Save" onClick={() => saveNote(markdownContent)} />,
            <NavbarItem icon={<FloppyDisk />} text="Save" onClick={() => saveNote(markdownContent)} />],
        [<Editor/>, <Preview />])


    return (
        <div className="w-full h-full rounded-md flex flex-1 flex-col p-1.5 gap-1.5 sm:flex-row overflow-y-hidden">
            <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContentCallback} />
            <Preview htmlContent={parsedContent} /> 
        </div>
    )
}