import useLocalStorageMarkdown from "../../hooks/useMarkdownContent/useMarkdownContent.js";
import Editor from "../Editor/Editor";
import Preview from "../Preview/Preview";
import { Upload, FloppyDisk } from "iconoir-react/regular";
import { saveNote } from '../../services/textEditorService/textEditorService.js';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils.js'
<<<<<<< HEAD
import NavbarItem from "../NavbarItem/NavbarItem";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth/useAuth.js";
import { AlertDismissible } from "../AlertDismissible/AlertDismissible.jsx";
=======
import {useOutletContext} from "react-router-dom";
import NavbarItem from "../NavbarItem/NavbarItem";
import {useEffect} from "react";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
>>>>>>> main

/**
 * The text editor is composed of two sub-components, the Editor and the Preview. View their documentation for more details
 * 
<<<<<<< HEAD
 * @returns {TextEditor}
 */
export default function TextEditor() {
    const [markdownContent, setMarkdownContentCallback] = useLocalStorageMarkdown();
    const auth = useAuth();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const navigate = useNavigate();
    const parsedContent = parseContent(markdownContent);

    // Attempt to send the note to the server. If successful, clear the local storage. Otherwise, display the error.
    const handleSaveNote = async () => {
        const storedContent = localStorage.getItem("md-content");

        // Don't send unnecessary requests for empty notes
        if (!storedContent) {
            setAlertColor("red");
            setAlert("Cannot save empty note");
            return;
        }

        saveNote(storedContent, auth.access).then((res) => {
            if (res.status === 200) {
                // Clear local storage on success
                setMarkdownContentCallback('');
                setAlertColor("green");
                setAlert("Note saved successfully");
            } 
        }).catch((err) => {
            if (err.response && err.response.data && err.response.data.content) {
                setAlertColor("red");
                setAlert(`${err.response.status}: ${err.response.data.content}`);
            } else {
                setAlertColor("red");
                setAlert(err.message);
            }
        });
    }

    useNavbarContents([
        <NavbarItem icon={<Upload />} text="Publish" data-testid="publish-btn" onClick={() => navigate('/not-implemented')} />,
        <NavbarItem icon={<FloppyDisk />} text="Save" data-testid="save-btn" onClick={handleSaveNote} />
    ],
        [auth]
    )

    return (
        <div className="w-full h-full rounded-md flex flex-1 flex-col p-1.5 gap-1.5 sm:flex-row overflow-y-hidden">
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContentCallback} />
            <Preview htmlContent={parsedContent} />
=======
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
>>>>>>> main
        </div>
    )
}