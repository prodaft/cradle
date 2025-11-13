// Type declarations for third-party libraries and module extensions

// ============================================================================
// Markdown-it plugins without types
// ============================================================================

declare module 'markdown-it-inject-linenumbers' {
  import MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-source-map' {
  import MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-task-lists' {
  import MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

// ============================================================================
// Image and asset imports
// ============================================================================

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// ============================================================================
// CSS imports
// ============================================================================

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.sass' {
  const content: Record<string, string>;
  export default content;
}

// ============================================================================
// Icon components
// ============================================================================

declare module 'iconoir-react' {
  import { ComponentType, SVGProps } from 'react';
  export const WarningCircle: ComponentType<SVGProps<SVGSVGElement>>;
  export const CheckSolid: ComponentType<SVGProps<SVGSVGElement>>;
  export const InfoEmpty: ComponentType<SVGProps<SVGSVGElement>>;
  export const Xmark: ComponentType<SVGProps<SVGSVGElement>>;
  export const Search: ComponentType<SVGProps<SVGSVGElement>>;
  export const HalfMoon: ComponentType<SVGProps<SVGSVGElement>>;
  export const Settings: ComponentType<SVGProps<SVGSVGElement>>;
  export const SunLight: ComponentType<SVGProps<SVGSVGElement>>;
  export const Undo: ComponentType<SVGProps<SVGSVGElement>>;
}
