import type { Text } from '@codemirror/state';

/**
 * ViewPlugin `Decoration.replace` ranges must not include a line break; CM6 throws
 * "Decorations that replace line breaks may not be specified via plugins" otherwise.
 * StateField-based decorations (e.g. markdown tables) may still span lines.
 */
export function pluginReplaceSpansLineBreak(
    doc: Text,
    from: number,
    to: number,
): boolean {
    return from < to && doc.sliceString(from, to).includes('\n');
}
