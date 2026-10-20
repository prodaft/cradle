/**
 * Text editor utilities for markdown parsing and link handling
 */

import type { components } from '@services/openapi/schema';
import DOMPurify from 'dompurify';
import { parseMarkdown } from '../parser/parse';

type FileReferenceWithNote = components['schemas']['FileReferenceWithNote'];

/**
 * Parse result from markdown parser
 */
interface ParseResult {
    html: string;
    metadata: Record<string, any>;
}

/**
 * Parses markdown content into HTML using a custom marked.js parser
 * Sanitizing is recommended by the marked documentation
 *
 * @param content - Markdown syntax
 * @param baseURL - Base URL of the backend
 * @param fileData - Information about the files that will be linked
 * @returns Parsed and sanitized HTML with metadata
 */
export const parseContent = async (
    content: string,
    baseURL: string,
    fileData?: FileReferenceWithNote[],
): Promise<ParseResult> => {
    const result = await parseMarkdown(content, baseURL, fileData);
    if (!result) return { html: '', metadata: {} };
    return {
        html: DOMPurify.sanitize(result.html),
        metadata: result.metadata,
    };
};

/**
 * Navigate handler function type
 */
export type NavigateHandler = (path: string, options?: { event?: Event }) => void;

/**
 * Handles link clicks in the Preview component.
 * If the link is local, it will navigate using the provided navigateHandler.
 * If the link is external, it is handed to openExternalLink (which asks for confirmation).
 * Middle-clicks on local links are left to the browser; on external links they are
 * intercepted too, so they can't bypass the confirmation.
 *
 * Useful information:
 * - All React Router navigation links have a `data-custom-href` attribute with the path they should navigate to.
 *
 * @param navigateHandler - How to handle local navigate links
 * @param openExternalLink - How to open external links
 * @returns Event handler function
 */
export const handleLinkClick =
    (navigateHandler: NavigateHandler, openExternalLink: (url: string) => void) =>
    (event: MouseEvent): boolean => {
        const anchor = (event.target as HTMLElement | null)?.closest('a');
        if (!anchor?.href) return false;

        const navigatePath = anchor.dataset.customHref;
        if (event.type === 'auxclick' && (event.button !== 1 || navigatePath))
            return false;

        event.preventDefault();
        try {
            new URL(anchor.href);
        } catch {
            return false;
        }
        if (navigatePath) {
            // Local links to dashboards
            navigateHandler(navigatePath, { event });
        } else {
            // External links
            openExternalLink(anchor.href);
        }
        return true;
    };
