import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth/useAuth";
import Preview from "../Preview/Preview";
import { parseContent } from "../../utils/textEditorUtils/textEditorUtils";
import useNavbarContents from "../../hooks/useNavbarContents/useNavbarContents";
import NavbarButton from "../NavbarButton/NavbarButton";
import AlertDismissible from "../AlertDismissible/AlertDismissible";
import { displayError } from "../../utils/responseUtils/responseUtils";
import { getPublishData } from "../../services/dashboardService/dashboardService";
import { Code, CodeBracketsSquare, Upload } from "iconoir-react/regular";
import { createMarkdownReportFromJson, downloadFile } from "../../utils/publishUtils/publishUtils";

/**
 * Fetches and displays the data to be published in a report. 
 * This data is expected to represent the contents of all notes in the `noteIds` array and their associated entities and metadata.
 * The user can alternate between views, and they can choose to export the contents as any of these formats.
 * 
 * The supported formats are:
 * - JSON
 * - HTML
 * 
 * @returns {PublishPreview}
 * @constructor
 */
export default function PublishPreview() {
    const location = useLocation();
    const [alert, setAlert] = useState("");
    const [alertColor, setAlertColor] = useState("red");
    const auth = useAuth();
    const [isJson, setIsJson] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const noteIds = searchParams.get("noteIds");

    const dummyData = { // TODO remove when API is ready
        "actors": [
            {
                "ID": 0,
                "name": "string",
                "type": "actor",
                "subtype": "",
            },
        ],
        "cases": [
            {
                "ID": 0,
                "name": "string",
                "type": "case",
                "subtype": "",
            },
        ],
        "entries": [
            {
                "ID": 0,
                "name": "string",
                "type": "entry",
                "subtype": "ip",
            }
        ],
        "metadata": [
            {
                "ID": 0,
                "name": "string",
                "type": "metadata",
                "subtype": "",
            },
        ],
        "notes": [
            {
                "content": "string",
                "timestamp": "2024-05-31T12:20:45.286Z",
            },
        ],
    }
    const [responseData, setResponseData] = useState(dummyData);

    useEffect(() => {
        getPublishData(auth.access, noteIds)
            .then((response) => {
                if (response.status === 200) {
                    setResponseData(response.data);
                }
            }).catch(displayError(setAlert, setAlertColor));
    }, [auth.access, noteIds, location]);

    const handlePublish = () => {
        const content = isJson ? JSON.stringify(responseData, null, 2) : parseContent(createMarkdownReportFromJson(responseData));
        try {
            downloadFile(content, isJson ? "json" : "html");
        } catch (e) {
            displayError(setAlert, setAlertColor)(e);
        }
    };

    const toggleView = useCallback(() => {
        setIsJson(prevIsJson => !prevIsJson);
    }, []);

    useNavbarContents([
        // Publishes the preview in any format provided
        <NavbarButton
            icon={<Upload />}
            text={`Publish as ${isJson ? "JSON" : "HTML"}`}
            data-testid="publish-btn"
            onClick={handlePublish}
        />,

        // This will change the view between JSON and HTML
        isJson ? <NavbarButton
            text="Show HTML"
            data-testid="show-html-btn"
            icon={<Code />}
            onClick={toggleView}
        /> : <NavbarButton
            text="Show JSON"
            data-testid="show-json-btn"
            icon={<CodeBracketsSquare />}
            onClick={toggleView}
        />
    ], [isJson, toggleView]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} onClose={() => setAlert("")} />
            <div className="w-full h-full overflow-hidden flex flex-col items-center p-4" data-testid="publish-preview">
                <div className="h-full w-[90%] rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter p-4 overflow-y-auto">
                    <div className="flex-grow">
                        {isJson ? (
                            <pre className="prose dark:prose-invert break-all overflow-x-hidden">{JSON.stringify(responseData, null, 2)}</pre>
                        ) : (
                            <Preview htmlContent={parseContent(createMarkdownReportFromJson(responseData))} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
