/**
 * Text editor utilities for markdown parsing and link handling
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { SyntaxNode } from '@lezer/common';
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
 * Link structure for custom cradle syntax
 * The custom syntax used to reference links to dashboards in the editor: `[[type:name|alias]]`
 */
interface Link {
    /** Starting position of the link */
    from: number;
    /** Ending position of the link */
    to: number;
    /** Type of the link */
    type: string | null;
    /** Text content of the link */
    text: string;
    /** Post-processing function for the link text */
    post?: (text: string) => string;
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
 * If the link is external, it will open in a new tab.
 *
 * Useful information:
 * - All React Router navigation links have a `data-custom-href` attribute with the path they should navigate to.
 *
 * @param navigateHandler - How to handle local navigate links
 * @returns Event handler function
 */
export const handleLinkClick =
    (navigateHandler: NavigateHandler) =>
    (event: Event): boolean => {
        const anchor = (event.target as HTMLElement | null)?.closest('a');
        if (!anchor?.href) return false;

        event.preventDefault();
        try {
            new URL(anchor.href);
        } catch {
            return false;
        }
        const navigatePath = anchor.dataset.customHref;
        if (navigatePath) {
            // Local links to dashboards
            navigateHandler(navigatePath, { event });
        } else {
            // External links
            window.open(anchor.href, '_blank');
        }
        return true;
    };

const LINK_REGEX_SINGLE =
    /^\[(?:([^:|]+)(?::(?:((?:\\\||[^|])+))?(?:\|((?:\\\||[^|])+))?)?)?\]$/;
const LINK_REGEX_DOUBLE =
    /^(?:~)?\[\[(?:([^:|]+)(?::(?:((?:\\\||[^|])+))?(?:\|((?:\\\||[^|])+))?)?)?\]\]$/;

/**
 * Autocomplete context for the editor
 */
interface AutocompleteContext {
    pos: number;
    state: EditorState;
}

/**
 * Gets the link node from the current position in the editor.
 * This function is used to determine if the current position is inside a link.
 * If the current position is inside a link, the link node is returned.
 * Otherwise, null is returned.
 *
 * @param context - The editor autocomplete context
 * @returns The link node or null
 */
const getLinkNode = (context: AutocompleteContext): SyntaxNode | null => {
    const pos = context.pos;
    const tree = syntaxTree(context.state);
    let node: SyntaxNode | null = tree.resolve(pos, -1);

    // Traverse the tree to check if the node or its parents are a link
    while (node) {
        if (node.type.name === 'Link') {
            return node;
        }
        node = node.parent;
    }
    return null;
};

/**
 * Parses a link from the text.
 * This function is used to determine if the current position is inside a link.
 * If the current position is inside a link, the link is returned.
 * Otherwise, null is returned.
 *
 * @param from - The starting position of the text
 * @param current - The current position in the text
 * @param text - The text to parse
 * @returns Parsed link or null
 */
const parseLink = (from: number, current: number, text: string): Link | null => {
    const isDouble = text.startsWith('[[') && text.endsWith(']]');
    const match = (isDouble ? LINK_REGEX_DOUBLE : LINK_REGEX_SINGLE).exec(text);

    if (!match) return null;

    // `alias` cannot have suggestions
    const [, type, name] = match;

    // Extract group positions — regexes are anchored so match.index is always 0
    const openLen = isDouble ? 2 : 1;
    const typeStart = from + openLen;
    const typeEnd = type ? typeStart + type.length : typeStart;

    const nameStart = typeEnd + 1;
    const nameEnd = name ? nameStart + name.length : nameStart;

    const typeText = text.slice(openLen, openLen + (type?.length ?? 0));

    if (current >= typeStart && current <= typeEnd)
        return {
            from: typeStart,
            to: typeEnd,
            type: null,
            text: typeText,
            post: (t: string) => `${t}:`,
        };
    else if (current >= nameStart && current <= nameEnd)
        return {
            from: nameStart,
            to: nameEnd,
            type: typeText,
            text: text.slice(
                openLen + (type?.length ?? 0) + 1,
                openLen + (type?.length ?? 0) + 1 + (name?.length ?? 0),
            ),
        };

    return null;
};
