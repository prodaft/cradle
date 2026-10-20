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
                '--pm-cursor-color': 'var(--foreground)',
            },
            '.cm-content': {
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
                // Syntax colors copied from prosemark's lightTheme (not part of
                // prosemarkBaseThemeSetup). Not mapped to --chart-*: that palette is
                // grayscale in some themes, which made strings match the code background.
                '--pm-syntax-link': 'oklch(62.75% 0.188 259.38)',
                '--pm-syntax-keyword': 'oklch(58.13% 0.248 297.57)',
                '--pm-syntax-atom': 'oklch(51.29% 0.219 260.63)',
                '--pm-syntax-literal': 'oklch(57.38% 0.111 170.31)',
                '--pm-syntax-string': 'oklch(54.86% 0.184 25.53)',
                '--pm-syntax-regexp': 'oklch(65.88% 0.184 43.8)',
                '--pm-syntax-definition-variable': 'oklch(45.32% 0.171 260.3)',
                '--pm-syntax-local-variable': 'oklch(64.13% 0.09 184.42)',
                '--pm-syntax-type-namespace': 'oklch(49.1% 0.091 165.52)',
                '--pm-syntax-class-name': 'oklch(64.42% 0.11 168.83)',
                '--pm-syntax-special-variable-macro': 'oklch(52.58% 0.212 282.71)',
                '--pm-syntax-definition-property': 'oklch(42.1% 0.142 260.08)',
                '--pm-syntax-comment': 'oklch(62.79% 0.022 252.89)',
                '--pm-syntax-invalid': 'oklch(64.62% 0.203 29.2)',
            },
            '.cm-cursor, .cm-dropCursor': {
                borderLeftColor: 'var(--pm-cursor-color)',
            },
            // drawSelection puts .cm-selectionLayer under .cm-scroller as a sibling of
            // .cm-content, behind the text by default, where opaque line backgrounds
            // (fenced code) hide it. It is raised above the text instead; the highlight
            // is translucent so text stays readable. pointer-events must stay off:
            // otherwise clicks hit .cm-selectionBackground, eventBelongsToEditor() never
            // reaches contentDOM and mousedown (e.g. clearing select-all) is ignored.
            // The z-index needs !important because CodeMirror sets it inline.
            '.cm-selectionLayer': {
                pointerEvents: 'none',
                zIndex: '1 !important',
            },
            '.cm-selectionBackground': {
                backgroundColor:
                    'color-mix(in oklch, var(--ring) 20%, transparent) !important',
            },
            '.cm-selectionHandle': {
                pointerEvents: 'auto',
            },
            '.cm-selectionMatch': {
                backgroundColor: 'color-mix(in oklch, var(--ring) 12%, transparent)',
            },
            '.cm-lineNumbers': {
                color: 'var(--muted-foreground)',
            },
            '.cm-lineNumbers .cm-gutterElement': {
                padding: '0 8px',
                minWidth: '40px',
            },
            '.cm-gutters': {
                backgroundColor: 'var(--background)',
                borderRight: '1px solid var(--border)',
            },
            // Fenced code lines keep their block background when active, otherwise
            // the line holding the cursor punches a hole in the code box.
            '.cm-activeLine:not(.cm-fenced-code-line)': {
                backgroundColor: 'transparent',
            },
            // Prosemark hides emphasis marks (**) via font-size:0px which produces
            // zero-height DOM rects. Those confuse CodeMirror's InlineCoordsScan.scan()
            // into an infinite loop when a Decoration.replace widget is on the same line
            // (the scan oscillates between y±1 around the zero-height rect's baseline).
            // display:none produces empty getClientRects(), so the element is skipped
            // entirely in the scan. Prosemark still removes this class when the cursor
            // is inside the node, so the marks become visible for editing as usual.
            '.cm-hidden-token': { display: 'none' },
            // Search panel styling
            '.cm-panel': {
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '13px',
            },
            // CodeMirror styles the search panel via `.cm-panel.cm-search`, so these
            // selectors need the same specificity to win.
            '.cm-panel.cm-search': {
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
            },
            '.cm-panel.cm-search label': {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--foreground)',
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
            // CodeMirror paints a gradient background-image over the button color.
            '.cm-button': {
                backgroundColor: 'var(--secondary)',
                backgroundImage: 'none',
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
                backgroundImage: 'none',
                transform: 'scale(0.98)',
            },
            '.cm-searchMatch': {
                backgroundColor: 'color-mix(in oklch, var(--ring) 20%, transparent)',
                outline: '1px solid var(--ring)',
            },
            '.cm-searchMatch-selected': {
                outline: '2px solid var(--ring)',
            },
            // Tooltip styling for autocomplete and lint overlays
            '.cm-tooltip': {
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: '13px',
                padding: '4px',
                zIndex: 50,
            },
            '.cm-tooltip-autocomplete': {
                minWidth: '220px',
            },
            // CodeMirror styles the list via `.cm-tooltip.cm-tooltip-autocomplete > ul`
            // and the selected item via `... ul li[aria-selected]`, so these selectors
            // need at least the same specificity to win.
            '.cm-tooltip.cm-tooltip-autocomplete > ul': {
                padding: '4px',
                maxHeight: '260px',
            },
            '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                borderRadius: '6px',
            },
            '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
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
            '.cm-tooltip-lint li': {
                padding: '2px 6px',
            },
            '.cm-diagnostic-error': {
                borderLeft: '3px solid var(--destructive)',
            },
            '.cm-diagnostic-warning': {
                borderLeft: '3px solid var(--chart-4)',
                display: 'flex',
                alignItems: 'center',
            },
            '.cm-diagnosticAction': {
                marginTop: '6px',
                backgroundColor: 'var(--secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'var(--foreground)',
            },
        },
        { dark: isDarkMode },
    );
}
