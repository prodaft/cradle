import { EditorView } from '@codemirror/view';

/**
 * Creates a custom CodeMirror theme for the Cradle editor.
 * Uses CSS variables from design.css for automatic light/dark switching.
 */
export function createCradleTheme(isDarkMode: boolean) {
    return EditorView.theme(
        {
            '&': {
                backgroundColor: 'var(--cradle-bg-primary)',
                color: 'inherit',
            },
            '.cm-content': {
                color: 'inherit',
            },
            '.cm-editor, .cm-scroller': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-selectionBackground': {
                backgroundColor: 'var(--cradle-md-selection) !important',
                zIndex: 3,
            },
            '.cm-selectionLayer': {
                zIndex: '0 !important',
            },
            '.cm-lineNumbers': {
                backgroundColor: 'var(--cradle-bg-primary)',
                color: 'var(--cradle-text-tertiary)',
                borderRight: '1px solid var(--cradle-border-primary)',
            },
            '.cm-lineNumbers .cm-gutterElement': {
                padding: '0 8px',
                minWidth: '40px',
                textAlign: 'right',
            },
            '.cm-gutter, .cm-gutters': {
                backgroundColor: 'var(--cradle-bg-primary)',
                borderRight: '1px solid var(--cradle-border-primary)',
            },
            '.cm-activeLine, .cm-activeLineGutter': {
                backgroundColor: 'transparent !important',
            },
            // Search panel styling
            '.cm-panel': {
                backgroundColor: 'var(--cradle-bg-elevated)',
                border: '1px solid var(--cradle-border-primary)',
                borderRadius: '6px',
                padding: '8px',
                boxShadow: 'var(--cradle-shadow-lg)',
                fontSize: '13px',
            },
            '.cm-panel.cm-search, .cm-search': {
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            },
            '.cm-search label': {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--cradle-text-secondary)',
                whiteSpace: 'nowrap',
            },
            '.cm-textfield': {
                backgroundColor: 'var(--cradle-bg-secondary)',
                border: '1px solid var(--cradle-border-primary)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '13px',
                color: 'var(--cradle-text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            },
            '.cm-textfield:focus': {
                borderColor: 'var(--cradle-accent-primary)',
                boxShadow: '0 0 0 2px var(--cradle-glow-primary)',
            },
            '.cm-button': {
                backgroundColor: 'var(--cradle-bg-secondary)',
                border: '1px solid var(--cradle-border-primary)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                color: 'var(--cradle-text-primary)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                fontWeight: '500',
            },
            '.cm-button:hover': {
                backgroundColor: 'var(--cradle-bg-tertiary)',
                borderColor: 'var(--cradle-accent-primary)',
            },
            '.cm-button:active': {
                transform: 'scale(0.98)',
            },
            '.cm-searchMatch': {
                backgroundColor: 'var(--cradle-md-selection)',
                outline: '1px solid var(--cradle-accent-primary)',
            },
            '.cm-searchMatch-selected': {
                backgroundColor: 'var(--cradle-glow-primary)',
                outline: '2px solid var(--cradle-accent-primary)',
            },
        },
        { dark: isDarkMode },
    );
}
