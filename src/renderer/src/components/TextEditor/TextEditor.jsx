import useLocalStorageMarkdown from "../../hooks/useMarkdownContent/useMarkdownContent.js";
import Editor from "../Editor/Editor";
import Preview from "../Preview/Preview";
import { Upload, FloppyDisk } from "iconoir-react/regular";
import { saveNote } from '../../services/textEditorService/textEditorService.js';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils.js'
import NavbarItem from "../NavbarItem/NavbarItem";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth/useAuth.js";
import AlertDismissible from "../AlertDismissible/AlertDismissible.jsx";
import { displayError } from "../../utils/responseUtils/responseUtils.js";
import useLightMode from "../../hooks/useLightMode/useLightMode.js";
import MultipleChoiceDialog from "../MultipleChoiceDialog/MultipleChoiceDialog.jsx";

/**
 * The text editor is composed of two sub-components, the Editor and the Preview. View their documentation for more details
 * 
 * @returns {TextEditor}
 */
export default function TextEditor() {
    const [markdownContent, setMarkdownContentCallback] = useLocalStorageMarkdown();
    const auth = useAuth();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const navigate = useNavigate();
    const parsedContent = parseContent(markdownContent);
    const isLightMode = useLightMode();
    const [dialog, setDialog] = useState(false);

    // Open the dialog to save the note. If the note is empty, display an error.
    const openDialog = () => {
        const storedContent = localStorage.getItem("md-content");

        // Don't send unnecessary requests for empty notes
        if (!storedContent) {
            setAlertColor("red");
            setAlert("Cannot save empty note");
            return;
        }

        setDialog(true);
    }

    // Attempt to send the note to the server. If successful, clear the local storage. Otherwise, display the error.
    const handleSaveNote = (publishable) => () => {
        const storedContent = localStorage.getItem("md-content");

        saveNote(auth.access, storedContent, publishable).then((res) => {
            if (res.status === 200) {
                // Clear local storage on success
                setMarkdownContentCallback('');
                setAlertColor("green");
                setAlert("Note saved successfully.");
            } 
        }).catch(displayError(setAlert, setAlertColor));
    }

    // Buttons for the dialog. Label & handler function
    const dialogButtons = {
        "Save As Publishable": handleSaveNote(true),
        "Save As Not Publishable": handleSaveNote(false),
    }

    useNavbarContents([
        <NavbarItem icon={<Upload />} text="Publish" data-testid="publish-btn" onClick={() => navigate('/not-implemented')} />,
        <NavbarItem icon={<FloppyDisk />} text="Save" data-testid="save-btn" onClick={openDialog} />
    ],
        [auth]
    )

    return (
        <div className="w-full h-full rounded-md flex flex-col p-1.5 gap-1.5 sm:flex-row overflow-y-hidden">
            <MultipleChoiceDialog open={dialog} setOpen={setDialog} title={"Save Note"} description={"How do you want to save this note?"} buttons={dialogButtons} />
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div className={"h-1/2 sm:h-full w-full bg-gray-2 rounded-md"}>
                <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContentCallback} isLightMode={isLightMode} />
            </div>
            <div className={"h-1/2 sm:h-full w-full bg-gray-2 rounded-md"}>
                <Preview htmlContent={parsedContent}/>
            </div>
        </div>
    )
}