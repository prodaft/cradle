import DOMPurify from "dompurify"

/**
 * This Preview component expects a content parameter, which it uses to set as inner HTML to itself.
 * This can be a dangerous procedure if the content is not sanitized, so the Preview also performs this step.
 * 
 * @param {string} content - the (HTML) content to preview
 * @returns Preview
 */
export default function Preview({ htmlContent }) {
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    return (
        <div className="h-[90vh] bg-cradle1 p-6 prose w-full !max-w-none prose-invert prose-img:w-fit break-all
            scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-cradle3
            scrollbar-track-cradle1 overflow-hidden overflow-y-scroll" dangerouslySetInnerHTML={{__html: sanitizedContent}}
            data-testid="preview">
        </div>
    )
}
