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

export { parseContent }
