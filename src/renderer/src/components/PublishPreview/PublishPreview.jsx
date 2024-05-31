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

/**
 * TODO
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

    const createMarkdownReportFromJson = (data) => { // TODO extract into utils class
        const { actors, cases, entries, metadata, notes } = data;
        let markdown = "";
        for (const note of notes) {
            markdown += `### ${note.timestamp}\n\n`;
            markdown += `${note.content}\n\n`;
        }
        return markdown;
    };

    const handlePublish = () => {
        console.log("Publishing as", isJson ? "JSON" : "HTML");
        // TODO multiple choice with json and html for now
    };

    const toggleView = useCallback(() => {
        setIsJson(prevIsJson => !prevIsJson);
    }, []);

    useNavbarContents([
        // Publishes the preview in any format provided
        <NavbarButton
            icon={<Upload />}
            text="Publish as JSON"
            data-testid="publish-btn"
            onClick={handlePublish}
        />,

        // This will change the view between JSON and HTML
        isJson ? <NavbarButton
            text="Show HTML"
            icon={<Code />}
            onClick={toggleView}
        /> : <NavbarButton
            text="Show JSON"
            icon={<CodeBracketsSquare />}
            onClick={toggleView}
        />
    ], [isJson, toggleView]);

    return (
        <>
            <AlertDismissible alert={alert} color={alertColor} onClose={() => setAlert("")} />
            <div className="w-full h-full overflow-hidden flex flex-col items-center p-4">
                <div className="h-full w-[90%] rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter p-4 overflow-y-auto">
                    <div className="flex-grow">
                        {isJson ? (
                            <pre className="prose dark:prose-invert break-all overflow-x-hidden">{JSON.stringify(createMarkdownReportFromJson(responseData))}</pre>
                        ) : (
                            <Preview htmlContent={parseContent()} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
