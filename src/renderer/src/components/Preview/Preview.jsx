import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { handleLinkClick } from '../../utils/textEditorUtils/textEditorUtils';
import { useAuth } from '../../hooks/useAuth/useAuth';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

/**
 * This Preview component expects a content parameter, which it uses to set as inner HTML to itself.
 * This can be a dangerous procedure if the content is not sanitized, so the Preview also performs this step.
 *
 * @param {string} htmlContent - the (HTML) content to preview
 * @returns {Preview}
 */
export default function Preview({ htmlContent }) {
    const auth = useAuth();
    const sanitizedContent = DOMPurify.sanitize(htmlContent);
    const navigate = useNavigate();
    const previewRef = useRef(null);
    const [alert, setAlert] = useState('');
    const [alertColor, setAlertColor] = useState('red');

    useEffect(() => {
        // Handle local and external links using the navigate hook
        const handleLinkClickNavigate = handleLinkClick(navigate);

        const previewDiv = previewRef.current;
        previewDiv.addEventListener('click', handleLinkClickNavigate);

        return () => {
            previewDiv.removeEventListener('click', handleLinkClickNavigate);
        };
    }, [sanitizedContent, navigate]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} color={alertColor} />
            <div
                className='h-full w-full p-4 bg-transparent prose max-w-none dark:prose-invert break-all
                       overflow-y-auto rounded-lg flex-1 overflow-x-hidden'
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                data-testid='preview'
                ref={previewRef}
            ></div>
        </>
    );
}
