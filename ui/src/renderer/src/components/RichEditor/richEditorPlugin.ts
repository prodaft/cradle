import { ViewPlugin } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';

import tagParser from './tagParser';
import highlightStyle from './highlightStyle';
import RichEditPlugin from './richEditPlugin';
import renderBlock from './renderBlock';

import type { Config } from '@markdoc/markdoc';

export type MarkdocPluginConfig = { lezer?: any, markdoc: Config };

export default function (config: MarkdocPluginConfig) {
  const mergedConfig = {
    ...config.lezer ?? [],
    extensions: [tagParser, ...config.lezer?.extensions ?? []]
  };

  return ViewPlugin.fromClass(RichEditPlugin, {
    decorations: v => v.decorations,
    provide: v => [
      renderBlock(config.markdoc),
      syntaxHighlighting(highlightStyle),
      markdown(mergedConfig)
    ],
    eventHandlers: {
      mousedown({ target }, view) {
        if (target instanceof Element && target.matches('.cm-markdoc-renderBlock *'))
          view.dispatch({ selection: { anchor: view.posAtDOM(target) } });
      }
    }
  });
}
