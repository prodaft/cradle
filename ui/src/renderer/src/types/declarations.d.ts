// Type declarations for third-party libraries and module extensions

// ============================================================================
// Markdown-it plugins without types
// ============================================================================

declare module 'markdown-it-inject-linenumbers' {
    const plugin: MarkdownIt.PluginSimple;
    export default plugin;
}

declare module 'markdown-it-source-map' {
    const plugin: MarkdownIt.PluginSimple;
    export default plugin;
}

declare module 'markdown-it-task-lists' {
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
    export const Iconoir: Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

    export const WarningCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const CheckSolid: ComponentType<SVGProps<SVGSVGElement>>;
    export const CheckCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const CheckCircleSolid: ComponentType<SVGProps<SVGSVGElement>>;
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
    export const Plus: ComponentType<SVGProps<SVGSVGElement>>;
    export const Menu: ComponentType<SVGProps<SVGSVGElement>>;
    export const SplitArea: ComponentType<SVGProps<SVGSVGElement>>;

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
    export const Edit: ComponentType<SVGProps<SVGSVGElement>>;
    export const EditPencil: ComponentType<SVGProps<SVGSVGElement>>;
    export const Eye: ComponentType<SVGProps<SVGSVGElement>>;
    export const EyeClosed: ComponentType<SVGProps<SVGSVGElement>>;
    export const PlusCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const RefreshCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const Copy: ComponentType<SVGProps<SVGSVGElement>>;


    // Missing icons - add declarations
    export const Check: ComponentType<SVGProps<SVGSVGElement>>;
    export const Calendar: ComponentType<SVGProps<SVGSVGElement>>;
    export const Clock: ComponentType<SVGProps<SVGSVGElement>>;
    export const ClockRotateRight: ComponentType<SVGProps<SVGSVGElement>>;
    export const DesignNib: ComponentType<SVGProps<SVGSVGElement>>;
    export const Erase: ComponentType<SVGProps<SVGSVGElement>>;
    export const InfoCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const InfoCircleSolid: ComponentType<SVGProps<SVGSVGElement>>;
    export const Key: ComponentType<SVGProps<SVGSVGElement>>;
    export const Link: ComponentType<SVGProps<SVGSVGElement>>;
    export const Lock: ComponentType<SVGProps<SVGSVGElement>>;
    export const Mail: ComponentType<SVGProps<SVGSVGElement>>;
    export const MailOpen: ComponentType<SVGProps<SVGSVGElement>>;
    export const MinusCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const MoreVert: ComponentType<SVGProps<SVGSVGElement>>;
    export const PauseSolid: ComponentType<SVGProps<SVGSVGElement>>;
    export const PlaySolid: ComponentType<SVGProps<SVGSVGElement>>;
    export const ProfileCircle: ComponentType<SVGProps<SVGSVGElement>>;
    export const Refresh: ComponentType<SVGProps<SVGSVGElement>>;
    export const RefreshDouble: ComponentType<SVGProps<SVGSVGElement>>;
    export const User: ComponentType<SVGProps<SVGSVGElement>>;
    export const WarningTriangle: ComponentType<SVGProps<SVGSVGElement>>;
    export const WarningTriangleSolid: ComponentType<SVGProps<SVGSVGElement>>;
    export const WarningCircleSolid: ComponentType<SVGProps<SVGSVGElement>>;
}

// ============================================================================
// Vite environment variables
// ============================================================================

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_ENV?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
