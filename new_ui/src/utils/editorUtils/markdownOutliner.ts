export interface HeaderNode {
    nodeName: string;
    onNodeClick: (nodeName: string, children: HeaderNode[], level: number) => void;
    children: HeaderNode[];
    separatorBefore?: boolean;
}

/**
 * Extracts header nodes from markdown content.
 * It detects header lines (those starting with '#' characters)
 * and marks a header with `separatorBefore: true` if a markdown
 * separator was found between it and the previous header.
 *
 * Additionally, each header node's onNodeClick calls the provided `onClick`
 * callback with the offset (the character index in the file) of the header's start.
 *
 * @param content The markdown content as a string.
 * @param onClick A callback that receives the offset of the header when a node is clicked.
 * @returns An array of header nodes representing the markdown header hierarchy.
 */
export default function extractHeaderHierarchy(
    content: string,
    onClick: (offset: number) => void,
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

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        if (isHorizontalRule(line)) {
            pendingSeparator = true;
        } else if (line.startsWith('#')) {
            const match = line.match(/^(#+)\s+(.*)$/);
            if (!match) {
                continue;
            }
            const level = match[1].length;
            const text = parseLink(match[2].trim());

            const node: HeaderNode = {
                nodeName: text,
                onNodeClick: (nodeName, children, level) => {
                    onClick(i + 1);
                },
                children: [],
            };

            if (headerFound && pendingSeparator) {
                node.separatorBefore = true;
            }
            headerFound = true;
            pendingSeparator = false;

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            if (stack.length === 0) {
                result.push(node);
            } else {
                const parent = stack[stack.length - 1].node;
                parent.children = parent.children || [];
                parent.children.push(node);
            }
            stack.push({ level, node });
        }
    }

    return result;
}
