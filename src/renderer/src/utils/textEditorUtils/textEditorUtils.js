import DOMPurify from "dompurify";
import marked from "../customParser/customParser"

/**
 * Parses markdown content into HTML using a custom marked.js parser
 * Sanitizing is recommended by the marked documentation: https://github.com/markedjs/marked?tab=readme-ov-file#usage
 * 
 * @param {string} content - Markdown syntax
 * @returns {string} parsed and sanitized HTML
 */
const parseContent = (content) => DOMPurify.sanitize(marked.parse(content));

/**
 * Handles link clicks in the preview component
 * 
 * @param {(string) => void} handler - navigate function
 * @returns {(event: MouseEvent) => void} event handler
 */
const handleLinkClick = (handler) => (event) => {
    const target = event.target;
    if (target.tagName === 'A' && target.href) {
        event.preventDefault();
        const url = new URL(target.href);
        const path = url.pathname + url.search;
        if (url.origin === window.location.origin) {
            // Local links
            handler(path);
        } else {
            // External links
            window.open(target.href, '_blank');
        }
    }
};

export { parseContent, handleLinkClick }
