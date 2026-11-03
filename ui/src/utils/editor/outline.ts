import { CradleEditor } from '@/utils/editor/enhancements';
import { titleHeadingNumber } from '@/utils/editor/title-line';
import { markdown } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { Text } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { GFM } from '@lezer/markdown';

export interface HeaderNode {
    nodeName: string;
    onNodeClick: () => void;
    children: HeaderNode[];
    separatorBefore?: boolean;
    startLine: number;
    endLine: number;
}

/** Same block and link syntax as the editor, so code blocks and frontmatter are skipped. */
const parser = yamlFrontmatter({
    content: markdown({ extensions: [GFM, CradleEditor.extension()] }),
}).language.parser;

const HEADING = /^(?:ATXHeading|SetextHeading)(\d)$/;

/** Syntax markers left out of a heading's displayed text. */
const HIDDEN_NODES = new Set([
    'HeaderMark',
    'EmphasisMark',
    'CodeMark',
    'StrikethroughMark',
    'LinkMark',
]);

/** The value and alias of a cradle link's `[[type:value|alias]]` body. */
const CRADLE_LINK_BODY = /^[^:]*:?((?:\\.|[^|\\])*)(?:\|(.*))?$/s;

/** A heading's plain text: markdown markers removed, cradle links shown by alias or value. */
function inlineText(node: SyntaxNode, source: string): string {
    if (HIDDEN_NODES.has(node.name)) return '';
    if (node.name === 'Escape') return source.slice(node.from + 1, node.to);
    if (node.name === 'CradleLink') {
        // Read the raw link: the parser's value range is off when it has spaces.
        const raw = source.slice(node.from, node.to);
        const body = raw.slice(raw.indexOf('[[') + 2, raw.lastIndexOf(']]'));
        const [, value = '', alias] = CRADLE_LINK_BODY.exec(body) ?? [];
        return (alias ?? value).trim().replace(/\\([[\]|])/g, '$1');
    }

    // A link shows only its label, not its destination, title or reference.
    const end =
        node.name === 'Link' || node.name === 'Image'
            ? (node.getChildren('LinkMark')[1]?.from ?? node.to)
            : node.to;
    let text = '';
    let pos = node.from;
    for (
        let child = node.firstChild;
        child && child.from < end;
        child = child.nextSibling
    ) {
        text += source.slice(pos, child.from) + inlineText(child, source);
        // A cradle link's timestamp child ends past the link node itself.
        pos = Math.max(child.to, child.getChild('CradleLinkTimestamp')?.to ?? 0);
    }
    return text + source.slice(pos, Math.max(pos, end));
}

/**
 * Builds the heading hierarchy of a markdown note, leaving out its title heading.
 * A heading gets `separatorBefore` when a horizontal rule sits between it and the
 * previous heading. Clicking a node calls `onClick` with the end of its first line.
 */
export default function extractHeaderHierarchy(
    content: string,
    onClick?: (pos: number) => void,
): HeaderNode[] {
    const doc = Text.of(content.split('\n'));
    const titleNumber = titleHeadingNumber(doc);
    const result: HeaderNode[] = [];
    const stack: { level: number; node: HeaderNode }[] = [];
    let pendingSeparator = false;

    parser.parse(content).iterate({
        enter: (ref) => {
            if (ref.name === 'HorizontalRule') {
                pendingSeparator = true;
                return false;
            }
            const match = HEADING.exec(ref.name);
            if (!match) return;
            const level = Number(match[1]);

            const startLine = doc.lineAt(ref.from).number;
            const nodeName = inlineText(ref.node, content).replace(/\s+/g, ' ').trim();
            if (startLine === titleNumber || !nodeName) return false;

            const node: HeaderNode = {
                nodeName,
                onNodeClick: () => onClick?.(doc.line(startLine).to),
                children: [],
                startLine,
                endLine: doc.lines,
            };
            if (pendingSeparator && result.length > 0) node.separatorBefore = true;
            pendingSeparator = false;

            while (stack.length > 0 && stack[stack.length - 1]!.level >= level)
                stack.pop()!.node.endLine = startLine - 1;

            const parent = stack[stack.length - 1];
            if (parent) parent.node.children.push(node);
            else result.push(node);
            stack.push({ level, node });
            return false;
        },
    });

    return result;
}
