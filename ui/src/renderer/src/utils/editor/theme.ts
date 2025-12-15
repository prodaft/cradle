import { EditorView } from '@codemirror/view';

/**
 * Creates a custom CodeMirror theme for the Cradle editor
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
                '--pm-cursor-color': isDarkMode ? 'white' : 'black',
            },
            '.cm-editor': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-scroller': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-selectionBackground': {
                backgroundColor: isDarkMode
                    ? 'rgba(255, 140, 0, 0.3) !important'
                    : 'rgba(255, 140, 0, 0.2) !important',

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
            '.cm-gutter': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-gutters': {
                backgroundColor: 'var(--cradle-bg-primary)',
                borderRight: '1px solid var(--cradle-border-primary)',
            },
            '.cm-activeLine': {
                backgroundColor: 'transparent !important',
            },
            '.cm-activeLineGutter': {
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
            '.cm-panel.cm-search': {
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
            },
            '.cm-search': {
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
                transition: 'all 0.2s ease',
            },
            '.cm-textfield:focus': {
                borderColor: '#FF8C00',
                boxShadow: '0 0 0 2px rgba(255, 140, 0, 0.1)',
            },
            '.cm-button': {
                backgroundColor: 'var(--cradle-bg-secondary)',
                border: '1px solid var(--cradle-border-primary)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                color: 'var(--cradle-text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: '500',
            },
            '.cm-button:hover': {
                backgroundColor: 'var(--cradle-bg-tertiary)',
                borderColor: '#FF8C00',
            },
            '.cm-button:active': {
                transform: 'scale(0.98)',
            },
            '.cm-searchMatch': {
                backgroundColor: isDarkMode
                    ? 'rgba(255, 140, 0, 0.4)'
                    : 'rgba(255, 140, 0, 0.3)',
                outline: `1px solid ${isDarkMode ? 'rgba(255, 140, 0, 0.6)' : 'rgba(255, 140, 0, 0.5)'}`,
            },
            '.cm-searchMatch-selected': {
                backgroundColor: isDarkMode
                    ? 'rgba(255, 140, 0, 0.6)'
                    : 'rgba(255, 140, 0, 0.5)',
                outline: `2px solid ${isDarkMode ? 'rgba(255, 140, 0, 0.8)' : 'rgba(255, 140, 0, 0.7)'}`,
            },
        },
        {
            dark: isDarkMode,
        },
    );
}
