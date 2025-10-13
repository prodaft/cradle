import { Decoration, PluginValue } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import type { Range } from '@codemirror/state';

const tokenElement = [
  'InlineCode',
  'Emphasis',
  'StrongEmphasis',
  'FencedCode',
  'Link',
];

const tokenHidden = [
  'HardBreak',
  'LinkMark',
  'EmphasisMark',
  'CodeMark',
  'CodeInfo',
  'URL',
];

const decorationHidden = Decoration.mark({ class: 'cm-markdoc-hidden' });
const decorationBullet = Decoration.mark({ class: 'cm-markdoc-bullet' });
const decorationCode = Decoration.mark({ class: 'cm-markdoc-code' });
const decorationTag = Decoration.mark({ class: 'cm-markdoc-tag' });

export default class RichEditPlugin implements PluginValue {
  decorations: DecorationSet;
  private _lastProcessedRange: { from: number; to: number } | null = null;

  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    // Only reprocess if content, viewport, or selection changed
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView): DecorationSet {
    const widgets: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;
    const cursorRange = { from: cursor.from, to: cursor.to };

    for (let { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from, to,
        enter(node) {
          // Skip if cursor is inside this node (except for specific cases)
          const isCursorInside = cursorRange.from >= node.from && cursorRange.to <= node.to;
          
          if (node.name === 'MarkdocTag') {
            widgets.push(decorationTag.range(node.from, node.to));
            return;
          }

          if (node.name === 'FencedCode') {
            widgets.push(decorationCode.range(node.from, node.to));
            return;
          }

          // Don't hide syntax when cursor is inside headings or other elements
          if ((node.name.startsWith('ATXHeading') || tokenElement.includes(node.name)) && isCursorInside) {
            return false;
          }

          if (node.name === 'ListMark' && node.matchContext(['BulletList', 'ListItem'])) {
            // Only hide bullet if cursor is not at the exact position
            if (cursorRange.from !== node.from && cursorRange.from !== node.from + 1) {
              widgets.push(decorationBullet.range(node.from, node.to));
            }
            return;
          }

          if (node.name === 'HeaderMark') {
            widgets.push(decorationHidden.range(node.from, node.to + 1));
            return;
          }

          if (tokenHidden.includes(node.name)) {
            widgets.push(decorationHidden.range(node.from, node.to));
            return;
          }
        }
      });
    }

    return Decoration.set(widgets);
  }
}
