import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { handleLinkClick } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

/**
 * This Preview component expects a content parameter, which it uses to set as inner HTML to itself.
 * This can be a dangerous procedure if the content is not sanitized, so the Preview also performs this step.
 *
 * @function Preview
 * @param {Object} props - The props of the component.
 * @param {string} props.htmlContent - the (HTML) content to preview
 * @returns {Preview}
 * @constructor
 */
export default function Preview({ htmlContent }) {
    const sanitizedContent = DOMPurify.sanitize(htmlContent);
    const navigate = useNavigate();
    const previewRef = useRef(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        // Handle local and external links using the navigate hook
        const handleLinkClickNavigate = handleLinkClick(navigate);

        const previewDiv = previewRef.current;
        previewDiv.addEventListener('click', handleLinkClickNavigate);

        return () => {
            previewDiv.removeEventListener('click', handleLinkClickNavigate);
        };
    }, [navigate]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div
                className='h-full w-full p-4 bg-transparent prose max-w-none break-normal whitespace-normal dark:prose-invert overflow-y-auto rounded-lg flex-1 overflow-x-hidden'
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                data-testid='preview'
                ref={previewRef}
            ></div>
        </>
    );
}
