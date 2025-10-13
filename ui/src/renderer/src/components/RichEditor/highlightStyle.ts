import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export default HighlightStyle.define([
  { tag: t.heading1, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '32px', textDecoration: 'none' },
  { tag: t.heading2, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '28px', textDecoration: 'none' },
  { tag: t.heading3, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '24px', textDecoration: 'none' },
  { tag: t.heading4, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '22px', textDecoration: 'none' },
  { tag: t.link, fontFamily: 'sans-serif', textDecoration: 'underline', color: 'green' },
  { tag: t.emphasis, fontFamily: 'sans-serif', fontStyle: 'italic' },
  { tag: t.strong, fontFamily: 'sans-serif', fontWeight: 'bold' },
  { tag: t.monospace, fontFamily: 'monospace' },
  { tag: t.content, fontFamily: 'sans-serif' },
  { tag: t.meta, color: 'darkgrey' },
]);
