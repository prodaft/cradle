export interface HeaderNode {
    nodeName: string;
    onNodeClick: (nodeName: string, children: HeaderNode[], level: number) => void;
    children: HeaderNode[];
    separatorBefore?: boolean;
    startLine: number;
    endLine: number;
}

/**
 * Extracts header nodes from markdown content.
 * It detects header lines (those starting with '#' characters)
 * and marks a header with `separatorBefore: true` if a markdown
 * separator was found between it and the previous header.
 *
 * Additionally, each header node's onNodeClick calls the provided `onClick`
 * callback with the offset (the line number in the file) of the header's start.
 *
 * @param content The markdown content as a string.
 * @param onClick A callback that receives the line number of the header when a node is clicked.
 * @returns An array of header nodes representing the markdown header hierarchy.
 */
export default function extractHeaderHierarchy(
    content: string,
    onClick: (lineNumber: number) => void,
): HeaderNode[] {
    const lines = content.split('\n');
    const result: HeaderNode[] = [];

    const stack: { level: number; node: HeaderNode }[] = [];

    let headerFound = false;
    let pendingSeparator = false;

    function isHorizontalRule(line: string): boolean {
        return /^(\s*)([-*_])(?:\s*\2){2,}\s*$/.test(line);
    }

    function parseLink(text: string): string {
        const linkPattern = /\[\[([^:\]]+):([^\|\]]+)(?:\|([^\]]+))?\]\]/g;
        return text.replace(linkPattern, (match, key, value, alias) => {
            return alias ? alias : value;
        });
    }

    // Keep track of all headers in order to calculate endLine
    const allHeaders: HeaderNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        if (isHorizontalRule(line)) {
            pendingSeparator = true;
        } else if (line.startsWith('#')) {
            const match = line.match(/^(#+)\s+(.*)$/);
            if (!match) continue;

            const level = match[1].length;
            const text = parseLink(match[2].trim());

            const node: HeaderNode = {
                nodeName: text,
                onNodeClick: (nodeName, children, level) => {
                    onClick(i + 1);
                },
                children: [],
                startLine: i + 1, // line numbers start from 1
                endLine: lines.length, // temporary, will adjust later
            };

            if (headerFound && pendingSeparator) {
                node.separatorBefore = true;
            }
            headerFound = true;
            pendingSeparator = false;

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                const popped = stack.pop();
                if (popped) {
                    // Set endLine of parent header
                    popped.node.endLine = i;
                }
            }

            if (stack.length === 0) {
                result.push(node);
            } else {
                const parent = stack[stack.length - 1].node;
                parent.children.push(node);
            }

            stack.push({ level, node });
            allHeaders.push(node);
        }
    }

    // Adjust endLine for any remaining headers in the stack
    while (stack.length > 0) {
        const { node } = stack.pop()!;
        node.endLine = lines.length;
    }

    // Adjust endLine to first child's startLine if a node has children
    function adjustEndLines(node: HeaderNode) {
        if (node.children.length > 0) {
            node.endLine = node.children[0].startLine;
            node.children.forEach(adjustEndLines);
        }
    }

    result.forEach(adjustEndLines);

    return result;
}
