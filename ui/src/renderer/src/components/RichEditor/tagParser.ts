import { tags as t } from '@lezer/highlight'
import type { MarkdownConfig } from '@lezer/markdown';

export default {
  defineNodes: [
    { name: 'MarkdocTag', block: true, style: t.meta }
  ],
  parseBlock: [{
    name: 'MarkdocTag',
    endLeaf(_cx, line, _leaf) {
      return line.next == 123 && line.text.slice(line.pos).trim().startsWith('{%');
    },
    parse(cx, line) {
      if (line.next != 123) return false;

      const content = line.text.slice(line.pos).trim();
      
      // More robust tag detection
      if (!content.startsWith('{%')) return false;
      
      // Handle both single-line and multi-line tags
      if (content.endsWith('%}')) {
        // Single line tag
        cx.addElement(cx.elt('MarkdocTag', cx.lineStart, cx.lineStart + line.text.length));
        cx.nextLine();
        return true;
      } else {
        // Multi-line tag - for now, treat as single line and let the parser handle it
        // This is a simplified approach to avoid TypeScript issues with BlockContext
        cx.addElement(cx.elt('MarkdocTag', cx.lineStart, cx.lineStart + line.text.length));
        cx.nextLine();
        return true;
      }
    },
  }]
} as MarkdownConfig;
