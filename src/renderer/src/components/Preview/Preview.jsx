import DOMPurify from "dompurify"
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { handleLinkClick } from "../../utils/textEditorUtils/textEditorUtils";

/**
 * This Preview component expects a content parameter, which it uses to set as inner HTML to itself.
 * This can be a dangerous procedure if the content is not sanitized, so the Preview also performs this step.
 * 
 * @param {string} content - the (HTML) content to preview
 * @returns {Preview}
 */
export default function Preview({ htmlContent, isLightMode }) {
    const sanitizedContent = DOMPurify.sanitize(htmlContent);
    const navigate = useNavigate();

    useEffect(() => {
        // Handle local and external links using the navigate hook
        const handleLinkClickNavigate = handleLinkClick(navigate);

        const previewDiv = document.querySelector('[data-testid="preview"]');
        previewDiv.addEventListener('click', handleLinkClickNavigate);

        return () => {
            previewDiv.removeEventListener('click', handleLinkClickNavigate);
        };
    }, [navigate]);

    return (
        <div className={`h-1/2 sm:h-full p-4 prose w-full !max-w-none bg-gray-2
            ${isLightMode ? "" : "prose-invert"} prose-img:w-fit break-all
            overflow-y-scroll rounded-lg`} dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            data-testid="preview">
        </div>
    )
}
