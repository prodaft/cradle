import { Decoration, WidgetType, EditorView } from '@codemirror/view';
import { RangeSet, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

import markdoc from '@markdoc/markdoc';

import type { Config } from '@markdoc/markdoc';
import type { DecorationSet } from '@codemirror/view'
import type { EditorState, Range } from '@codemirror/state';

const patternTag = /{%\s*(?<closing>\/)?(?<tag>[a-zA-Z0-9-_]+)(?<attrs>\s+[^]+)?\s*(?<self>\/)?%}\s*$/m;

class RenderBlockWidget extends WidgetType {
  rendered: string;
  private _cachedSource: string;

  constructor(public source: string, config: Config) {
    super();
    this._cachedSource = source;

    try {
      const document = markdoc.parse(source);
      const transformed = markdoc.transform(document, config);
      this.rendered = markdoc.renderers.html(transformed);
    } catch (error) {
      console.error('Failed to render markdoc block:', error);
      console.error('Source content:', source);
      // Render the original markdown as plain text instead of error UI
      this.rendered = `<div class="cm-markdoc-fallback">${source}</div>`;
    }
  }

  eq(widget: RenderBlockWidget): boolean {
    return this._cachedSource === widget._cachedSource;
  }

  toDOM(): HTMLElement {
    const content = document.createElement('div');
    content.setAttribute('contenteditable', 'false');
    content.className = 'cm-markdoc-renderBlock';
    content.innerHTML = this.rendered;
    
    // Add click handler to prevent editor focus loss
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    return content;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function replaceBlocks(state: EditorState, config: Config, from?: number, to?: number) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;
  const cursorRange = { from: cursor.from, to: cursor.to };

  const tags: [number, number][] = [];
  const stack: number[] = [];

  // Cache for widget instances to avoid recreating identical widgets
  const widgetCache = new Map<string, RenderBlockWidget>();

  syntaxTree(state).iterate({
    from, to,
    enter(node) {
      if (!['Table', 'Blockquote', 'MarkdocTag'].includes(node.name))
        return;

      if (node.name === 'MarkdocTag') {
        const text = state.doc.sliceString(node.from, node.to);
        const match = text.match(patternTag);

        if (match?.groups?.self) {
          tags.push([node.from, node.to]);
          return;
        }

        if (match?.groups?.closing) {
          const last = stack.pop();
          if (last) tags.push([last, node.to]);
          return;
        }

        stack.push(node.from);
        return;
      }

      // Skip if cursor is inside this node
      if (cursorRange.from >= node.from && cursorRange.to <= node.to)
        return false;

      const text = state.doc.sliceString(node.from, node.to);
      
      // Use cached widget if available
      let widget = widgetCache.get(text);
      if (!widget) {
        widget = new RenderBlockWidget(text, config);
        widgetCache.set(text, widget);
      }

      const decoration = Decoration.replace({
        widget,
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));
    }
  });

  // Process markdoc tags
  for (let [from, to] of tags) {
    if (cursorRange.from >= from && cursorRange.to <= to) continue;
    
    const text = state.doc.sliceString(from, to);
    
    // Use cached widget if available
    let widget = widgetCache.get(text);
    if (!widget) {
      widget = new RenderBlockWidget(text, config);
      widgetCache.set(text, widget);
    }

    const decoration = Decoration.replace({
      widget,
      block: true,
    });

    decorations.push(decoration.range(from, to));
  }

  return decorations;
}

export default function (config: Config) {
  return StateField.define<DecorationSet>({
    create(state) {
      return RangeSet.of(replaceBlocks(state, config), true);
    },

    update(decorations, transaction) {
      return RangeSet.of(replaceBlocks(transaction.state, config), true);
    },

    provide(field) {
      return EditorView.decorations.from(field);
    },
  });
}
