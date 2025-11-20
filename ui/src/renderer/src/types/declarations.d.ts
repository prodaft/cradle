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
  export const ArrowDown: ComponentType<SVGProps<SVGSVGElement>>;
  export const ArrowRight: ComponentType<SVGProps<SVGSVGElement>>;
  export const Bin: ComponentType<SVGProps<SVGSVGElement>>;
  export const Download: ComponentType<SVGProps<SVGSVGElement>>;

  // File operations
  export const InputField: ComponentType<SVGProps<SVGSVGElement>>;
  export const PasteClipboard: ComponentType<SVGProps<SVGSVGElement>>;
  export const Trash: ComponentType<SVGProps<SVGSVGElement>>;
  export const Upload: ComponentType<SVGProps<SVGSVGElement>>;
  export const CloudUpload: ComponentType<SVGProps<SVGSVGElement>>;

  // Navigation
  export const NavArrowUp: ComponentType<SVGProps<SVGSVGElement>>;
  export const NavArrowDown: ComponentType<SVGProps<SVGSVGElement>>;
  export const NavArrowRight: ComponentType<SVGProps<SVGSVGElement>>;
  export const ArrowLeft: ComponentType<SVGProps<SVGSVGElement>>;
  export const Page: ComponentType<SVGProps<SVGSVGElement>>;

  // Sidebar icons
  export const Archive: ComponentType<SVGProps<SVGSVGElement>>;
  export const Bell: ComponentType<SVGProps<SVGSVGElement>>;
  export const BellNotification: ComponentType<SVGProps<SVGSVGElement>>;
  export const DatabaseBackup: ComponentType<SVGProps<SVGSVGElement>>;
  export const LogOut: ComponentType<SVGProps<SVGSVGElement>>;
  export const Notes: ComponentType<SVGProps<SVGSVGElement>>;
  export const Sparks: ComponentType<SVGProps<SVGSVGElement>>;
  export const UserCrown: ComponentType<SVGProps<SVGSVGElement>>;

  // Other
  export const Code: ComponentType<SVGProps<SVGSVGElement>>;
}

// ============================================================================
// Vite environment variables
// ============================================================================

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
