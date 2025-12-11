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
        },
        {
            dark: isDarkMode,
        },
    );
}
