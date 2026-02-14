export interface HeaderNode {
    nodeName: string;
    onNodeClick: () => void;
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
 * @param onClickLine A callback that receives the line number of the header when a node is clicked.
 * @param onClickHeaderName A callback that receives the header name when a node is clicked.
 * @returns An array of header nodes representing the markdown header hierarchy.
 */
export default function extractHeaderHierarchy(
    content: string,
    onClickLine: ((lineNumber: number) => void) | undefined,
    onClickHeaderName: ((headerName: string) => void) | undefined,
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
        const linkPattern = /\[\[[^:\]]+:([^|\]]+)(?:\|([^\]]+))?\]\]/g;
        return text.replace(linkPattern, (_match, value, alias) => {
            return alias ? alias : value;
        });
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (isHorizontalRule(line)) {
            pendingSeparator = true;
        } else if (line.startsWith('#')) {
            const match = line.match(/^(#+)\s+(.*)$/);
            if (!match) continue;

            const level = match[1].length;
            const text = parseLink(match[2].trim());

            const node: HeaderNode = {
                nodeName: text,
                onNodeClick: () => {
                    onClickLine?.(i + 1);
                    onClickHeaderName?.(text);
                },
                children: [],
                startLine: i + 1,
                endLine: lines.length,
            };

            if (headerFound && pendingSeparator) {
                node.separatorBefore = true;
            }
            headerFound = true;
            pendingSeparator = false;

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop()!.node.endLine = i;
            }

            if (stack.length === 0) {
                result.push(node);
            } else {
                stack[stack.length - 1].node.children.push(node);
            }

            stack.push({ level, node });
        }
    }

    while (stack.length > 0) {
        stack.pop()!.node.endLine = lines.length;
    }

    return result;
}
