import DOMPurify from "dompurify"
import { Component } from "react";

/**
 * This Preview component expects a content parameter, which it uses to set as inner HTML to itself.
 * This can be a dangerous procedure if the content is not sanitized, so the Preview also performs this step.
 * 
 * @param {string} content - the (HTML) content to preview
 * @returns {Component.Preview}
 */
export default function Preview({ htmlContent }) {
    const sanitizedContent = DOMPurify.sanitize(htmlContent);

    return (
        <div className="h-full p-2 bg-zinc-800 prose w-full !max-w-none prose-invert prose-img:w-fit break-all
             overflow-y-scroll rounded-lg" dangerouslySetInnerHTML={{__html: sanitizedContent}}
            data-testid="preview">
        </div>
    )
}
