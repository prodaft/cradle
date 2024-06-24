import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import Preview from '../Preview/Preview';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import NavbarDropdown from '../NavbarDropdown/NavbarDropdown';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { getPublishData } from '../../services/publishService/publishService';
import { Code, CodeBracketsSquare, Download } from 'iconoir-react/regular';
import {
    createMarkdownReportFromJson,
    downloadFile,
    createHtmlReport,
} from '../../utils/publishUtils/publishUtils';

/**
 * Fetches and displays the data to be published in a report.
 * This data is expected to represent the contents of all notes in the `noteIds` array and their associated entities and metadata.
 * The user can alternate between views, and they can choose to export the contents as any of these formats.
 *
 * The supported formats are:
 * - JSON
 * - HTML
 *
 * @function PublishPreview
 * @returns {PublishPreview}
 * @constructor
 */
export default function PublishPreview() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [isJson, setIsJson] = useState(false);
    const [responseData, setResponseData] = useState({});
    const [htmlContent, setHtmlContent] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { noteIds, entityName } = location.state;

    useEffect(() => {
        const mdReport = createMarkdownReportFromJson(responseData);
        parseContent(mdReport)
            .then((parsedContent) => setHtmlContent(parsedContent))
            .catch(displayError(setAlert));
    }, [responseData]);

    useEffect(() => {
        getPublishData(noteIds)
            .then((response) => {
                if (response.status === 200) {
                    setResponseData(response.data);
                }
            })
            .catch(displayError(setAlert, navigate));
    }, [location]);

    // Publishes the preview in the provided format.
    const handlePublish = useCallback(
        (extension) => {
            try {
                switch (extension) {
                    case 'html': {
                        const report = createHtmlReport(entityName, htmlContent);
                        downloadFile(report, extension);
                        break;
                    }
                    case 'json': {
                        const content = JSON.stringify(responseData, null, 2);
                        downloadFile(content, extension);
                        break;
                    }
                    default:
                        throw new Error(`Invalid format: ${extension}`);
                }
            } catch (error) {
                displayError(setAlert)(error);
            }
        },
        [isJson, responseData, entityName],
    );

    const toggleView = useCallback(() => {
        setIsJson((prevIsJson) => !prevIsJson);
    }, []);

    const publishDropdownButtons = [
        {
            label: 'JSON',
            handler: () => handlePublish('json'),
        },
        {
            label: 'HTML',
            handler: () => handlePublish('html'),
        },
    ];

    useNavbarContents(
        [
            // This will change the view between JSON and HTML
            isJson ? (
                <NavbarButton
                    text='Show HTML'
                    data-testid='show-html-btn'
                    key='show-html-btn'
                    icon={<Code />}
                    onClick={toggleView}
                />
            ) : (
                <NavbarButton
                    text='Show JSON'
                    data-testid='show-json-btn'
                    key='show-json-btn'
                    icon={<CodeBracketsSquare />}
                    onClick={toggleView}
                />
            ),

            <NavbarDropdown
                icon={<Download />}
                text='Download Report As...'
                data-testid='publish-btn'
                key='publish-btn'
                contents={publishDropdownButtons}
            />,
        ],
        [isJson, toggleView, handlePublish],
    );

    return (
        <>
            <AlertDismissible
                alert={alert}
                setAlert={setAlert}
                onClose={() => setAlert('')}
            />
            <div
                className='w-full h-full overflow-hidden flex flex-col items-center p-4'
                data-testid='publish-preview'
            >
                <div className='h-full w-[90%] rounded-md bg-cradle3 bg-opacity-20 backdrop-blur-lg backdrop-filter p-4 overflow-y-auto'>
                    <div className='flex-grow'>
                        {isJson ? (
                            <pre className='prose dark:prose-invert !break-all flex-1'>
                                {JSON.stringify(responseData, null, 2)}
                            </pre>
                        ) : (
                            <Preview htmlContent={htmlContent} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
