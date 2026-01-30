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
                '--pm-cursor-color': 'var(--foreground)',
            },
            '.cm-content': {
                color: 'inherit',
                caretColor: 'var(--pm-cursor-color)',
                // Map Prosemark CSS variables to our theme colors
                '--pm-header-mark-color': 'var(--primary)',
                '--pm-heading-color': 'var(--foreground)',
                '--pm-list-mark-color': 'var(--primary)',
                '--pm-link-color': 'var(--chart-1)',
                '--pm-muted-color': 'var(--muted-foreground)',
                '--pm-code-background-color': 'var(--muted)',
                '--pm-code-btn-background-color': 'var(--secondary)',
                '--pm-code-btn-hover-background-color': 'var(--accent)',
                '--pm-blockquote-vertical-line-background-color': 'var(--border)',
                // Syntax highlighting colors using our chart palette
                '--pm-syntax-link': 'var(--chart-1)',
                '--pm-syntax-keyword': 'var(--chart-4)',
                '--pm-syntax-atom': 'var(--chart-3)',
                '--pm-syntax-literal': 'var(--chart-2)',
                '--pm-syntax-string': 'var(--chart-5)',
                '--pm-syntax-regexp': 'var(--chart-3)',
                '--pm-syntax-definition-variable': 'var(--foreground)',
                '--pm-syntax-local-variable': 'var(--foreground)',
                '--pm-syntax-type-namespace': 'var(--chart-2)',
                '--pm-syntax-class-name': 'var(--chart-2)',
                '--pm-syntax-special-variable-macro': 'var(--chart-4)',
                '--pm-syntax-definition-property': 'var(--foreground)',
                '--pm-syntax-comment': 'var(--muted-foreground)',
                '--pm-syntax-invalid': 'var(--destructive)',
            },
            '.cm-editor, .cm-scroller': {
                backgroundColor: 'var(--background)',
            },
            '.cm-cursor, .cm-dropCursor, .cm-caret': {
                borderLeftColor: 'var(--pm-cursor-color) !important',
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
            // Tooltip styling for autocomplete and lint overlays
            '.cm-tooltip': {
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                padding: '4px',
                zIndex: 50,
            },
            '.cm-tooltip-autocomplete': {
                minWidth: '220px',
            },
            '.cm-tooltip-autocomplete ul': {
                listStyle: 'none',
                margin: 0,
                padding: '4px',
                maxHeight: '260px',
            },
            '.cm-tooltip-autocomplete li': {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
                color: 'var(--popover-foreground)',
                cursor: 'pointer',
            },
            '.cm-tooltip-autocomplete li[aria-selected]': {
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
            },
            '.cm-tooltip-autocomplete .cm-completionDetail': {
                marginLeft: 'auto',
                fontSize: '12px',
                color: 'var(--muted-foreground)',
            },
            '.cm-tooltip-autocomplete li[aria-selected] .cm-completionDetail': {
                color: 'var(--accent-foreground)',
                opacity: 0.8,
            },
            '.cm-tooltip-autocomplete .cm-completionMatchedText': {
                fontWeight: '600',
                color: 'var(--primary)',
            },
            '.cm-tooltip-autocomplete li[aria-selected] .cm-completionMatchedText': {
                color: 'var(--accent-foreground)',
            },
            '.cm-tooltip-lint': {
                padding: '6px',
            },
            '.cm-tooltip-lint ul': {
                listStyle: 'none',
                margin: 0,
                padding: 0,
            },
            '.cm-tooltip-lint li': {
                padding: '2px 6px',
                color: 'var(--popover-foreground)',
            },
            '.cm-diagnostic-error': {
                borderLeft: '3px solid var(--destructive)',
                paddingLeft: '8px',
            },
            '.cm-diagnostic-warning': {
                borderLeft: '3px solid var(--chart-4)',
                paddingLeft: '16px',
                display: 'flex',
                alignItems: 'center',
            },
            '.cm-diagnostic-info': {
                borderLeft: '3px solid var(--chart-2)',
                paddingLeft: '8px',
            },
            '.cm-diagnosticAction': {
                marginTop: '6px',
                backgroundColor: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'var(--foreground)',
                cursor: 'pointer',
            },
        },
        { dark: isDarkMode },
    );
}
