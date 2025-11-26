import { EditorView } from '@codemirror/view';

/**
 * Creates a custom CodeMirror theme for the Cradle editor
 */
export function createCradleTheme(isDarkMode: boolean) {
    return EditorView.theme(
        {
            '&': {
                backgroundColor: 'var(--cradle-bg-primary)',
                color: 'var(--cradle-text-primary)',
            },
            '.cm-content': {
                color: 'var(--cradle-text-primary)',
                /* === COLORS === */
                /* Primary / formatting colors */
                '--pm-header-mark-color': 'var(--cradle-accent-primary)',
                '--pm-link-color': 'var(--cradle-accent-primary)',
                '--pm-muted-color': 'var(--cradle-text-tertiary)',
                '--pm-cursor-color': isDarkMode ? 'white' : 'black',

                /* Code */
                '--pm-code-background-color': isDarkMode
                    ? 'var(--cradle-bg-tertiary)' // purrmd-inline-code-bg-color
                    : 'var(--cradle-bg-secondary)',
                '--pm-code-btn-background-color': isDarkMode
                    ? 'var(--cradle-bg-secondary)' // code-block-bg-color
                    : 'var(--cradle-bg-tertiary)',
                '--pm-code-btn-hover-background-color': isDarkMode
                    ? 'rgba(255, 140, 0, 0.1)'
                    : 'rgba(255, 140, 0, 0.08)',

                /* Blockquote */
                '--pm-blockquote-vertical-line-background-color':
                    'var(--cradle-accent-primary)',

                /* Syntax highlight */
                '--pm-syntax-keyword': 'var(--cradle-accent-primary)',
                '--pm-syntax-link': 'var(--cradle-accent-primary)',
                '--pm-syntax-string': 'var(--cradle-text-primary)',
                '--pm-syntax-comment': 'var(--cradle-text-tertiary)',
            },
            '.cm-editor': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '.cm-scroller': {
                backgroundColor: 'var(--cradle-bg-primary)',
            },
            '&.cm-focused .cm-selectionBackground, ::selection': {
                backgroundColor: isDarkMode
                    ? 'rgba(255, 140, 0, 0.3) !important'
                    : 'rgba(255, 140, 0, 0.2) !important',
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
        },
        {
            dark: isDarkMode,
        },
    );
}
