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
                '--purrmd-primary-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-opacity': '0.7',

                '--purrmd-h1-size': '1.802em',
                '--purrmd-h2-size': '1.602em',
                '--purrmd-h3-size': '1.424em',
                '--purrmd-h4-size': '1.266em',
                '--purrmd-h5-size': '1.125em',
                '--purrmd-h6-size': '1em',
                '--purrmd-h1-weight': '600',
                '--purrmd-h2-weight': '600',
                '--purrmd-h3-weight': '600',
                '--purrmd-h4-weight': '500',
                '--purrmd-h5-weight': '500',
                '--purrmd-h6-weight': '500',
                '--purrmd-h-color': 'var(--cradle-text-primary)',
                '--purrmd-formatting-heading-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-h-opacity': '0.7',

                '--purrmd-link-color': 'var(--cradle-accent-primary)',
                '--purrmd-link-url-color': 'var(--cradle-accent-secondary)',
                '--purrmd-link-title-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-link-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-link-opacity': '0.8',

                '--purrmd-inline-code-bg-color': isDarkMode
                    ? 'var(--cradle-bg-tertiary)'
                    : 'var(--cradle-bg-secondary)',
                '--purrmd-inline-code-color': 'var(--cradle-text-primary)',
                '--purrmd-formatting-inline-code-color': 'var(--cradle-text-tertiary)',

                '--purrmd-code-block-bg-color': isDarkMode
                    ? 'var(--cradle-bg-secondary)'
                    : 'var(--cradle-bg-tertiary)',
                '--purrmd-code-block-border-radius': '0px',
                '--purrmd-code-block-info-bg-color': 'transparent',
                '--purrmd-code-block-info-bg-color-hover': isDarkMode
                    ? 'rgba(255, 140, 0, 0.1)'
                    : 'rgba(255, 140, 0, 0.08)',
                '--purrmd-formatting-code-block-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-code-opacity': '0.7',

                '--purrmd-formatting-blockquote-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-blockquote-border-thickness': '2px',
                '--purrmd-formatting-blockquote-border-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-blockquote-opacity': '0.8',

                '--purrmd-formatting-bullet-list-item-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-item-point-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-ordered-list-item-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-task-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-ordered-list-task-color': 'var(--cradle-text-tertiary)',
                '--purrmd-formatting-bullet-list-opacity': '0.8',
                '--purrmd-formatting-ordered-list-opacity': '0.8',

                '--purrmd-checkbox-list-height': '2rem',
                '--purrmd-checkbox-height': '1.0rem',
                '--purrmd-checkbox-color': 'var(--cradle-bg-elevated)',
                '--purrmd-checkbox-border-color': 'var(--cradle-border-accent)',
                '--purrmd-checkbox-checked-color': 'var(--cradle-accent-primary)',
                '--purrmd-checkbox-checked-border-color': 'var(--cradle-accent-primary)',

                '--purrmd-strong-weight': '600',
                '--purrmd-formatting-strong-color': 'var(--cradle-accent-primary)',
                '--purrmd-formatting-strong-opacity': '0.8',
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
        }
    );
}
