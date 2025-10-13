import markdoc from '@markdoc/markdoc';
import type { Config } from '@markdoc/markdoc';

markdoc.transformer.findSchema = (node, config) => {
  return node.tag ?
    config?.tags?.[node.tag] ?? config?.tags?.$$fallback :
    config?.nodes?.[node.type];
}

export default {
  tags: {
    $$fallback: {
      transform(node, config) {
        const children = node.transformChildren(config);
        const className = 'cm-markdoc-fallbackTag';
        return new markdoc.Tag('div', { class: className }, [
          new markdoc.Tag('div', { class: `${className}--name` }, [node?.tag ?? '']),
          new markdoc.Tag('div', { class: `${className}--inner` }, children)
        ]);
      }
    },
    callout: {
      attributes: {
        type: { type: String, default: 'info' },
        title: { type: String }
      },
      transform(node, config) {
        const children = node.transformChildren(config);
        const type = node.attributes.type || 'info';
        const title = node.attributes.title;
        const kind = type === 'warning' ? 'warning' : 'info';
        const icon = kind === 'warning' ? 'icon-exclamation' : 'icon-info';
        const className = `cm-markdoc-callout cm-markdoc-callout--${kind}`;
        
        const content = [
          new markdoc.Tag('span', { class: `icon ${icon}` }),
          new markdoc.Tag('div', { class: 'cm-markdoc-callout--content' }, children)
        ];

        if (title) {
          content.splice(1, 0, new markdoc.Tag('div', { class: 'cm-markdoc-callout--title' }, [title]));
        }

        return new markdoc.Tag('div', { class: className }, content);
      }
    },
    note: {
      attributes: {
        type: { type: String, default: 'info' }
      },
      transform(node, config) {
        const children = node.transformChildren(config);
        const type = node.attributes.type || 'info';
        const className = `cm-markdoc-note cm-markdoc-note--${type}`;
        return new markdoc.Tag('div', { class: className }, children);
      }
    }
  }
} as Config;
