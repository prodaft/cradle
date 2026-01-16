import { EditorView } from '@codemirror/view';

/**
 * Creates a custom CodeMirror theme for the Cradle editor.
 * Uses CSS variables from globals.css for automatic light/dark switching.
 */
export function createCradleTheme(isDarkMode: boolean) {
    return EditorView.theme(
        {
            '&': {
                backgroundColor: 'var(--background)',
                color: 'inherit',
            },
            '.cm-content': {
                color: 'inherit',
            },
            '.cm-editor, .cm-scroller': {
                backgroundColor: 'var(--background)',
            },
            '.cm-selectionBackground': {
                backgroundColor:
                    'color-mix(in oklch, var(--ring) 20%, transparent) !important',
                zIndex: 3,
            },
            '.cm-selectionLayer': {
                zIndex: '0 !important',
            },
            '.cm-lineNumbers': {
                backgroundColor: 'var(--background)',
                color: 'var(--muted-foreground)',
                borderRight: '1px solid var(--border)',
            },
            '.cm-lineNumbers .cm-gutterElement': {
                padding: '0 8px',
                minWidth: '40px',
                textAlign: 'right',
            },
            '.cm-gutter, .cm-gutters': {
                backgroundColor: 'var(--background)',
                borderRight: '1px solid var(--border)',
            },
            '.cm-activeLine, .cm-activeLineGutter': {
                backgroundColor: 'transparent !important',
            },
            // Search panel styling
            '.cm-panel': {
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
                boxShadow: 'var(--shadow-lg)',
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
                color: 'var(--foreground)',
                whiteSpace: 'nowrap',
            },
            '.cm-textfield': {
                backgroundColor: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '13px',
                color: 'var(--foreground)',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            },
            '.cm-textfield:focus': {
                borderColor: 'var(--ring)',
                boxShadow:
                    '0 0 0 2px color-mix(in oklch, var(--ring) 20%, transparent)',
            },
            '.cm-button': {
                backgroundColor: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                color: 'var(--foreground)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                fontWeight: '500',
            },
            '.cm-button:hover': {
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--ring)',
            },
            '.cm-button:active': {
                transform: 'scale(0.98)',
            },
            '.cm-searchMatch': {
                backgroundColor: 'color-mix(in oklch, var(--ring) 20%, transparent)',
                outline: '1px solid var(--ring)',
            },
            '.cm-searchMatch-selected': {
                backgroundColor: 'color-mix(in oklch, var(--ring) 20%, transparent)',
                outline: '2px solid var(--ring)',
            },
        },
        { dark: isDarkMode },
    );
}
