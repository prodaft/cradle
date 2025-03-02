import { linter } from '@codemirror/lint';
import { getLinkNode, parseLink } from '../../utils/textEditorUtils/textEditorUtils';
import { fetchLspPack } from '../../services/queryService/queryService';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { LanguageSupport, LRLanguage, syntaxTree } from '@codemirror/language';
import { parser as markdownParser } from '@lezer/markdown';

interface EnhancerOptions {
    lintDelay?: number;
    minSuggestionLength?: number;
    maxSuggestions?: number;
    [key: string]: any;
}

interface LspPack {
    classes: {
        [type: string]: {
            regex?: string;
            enum?: string[];
        };
    };
    instances: {
        [type: string]: string[];
    };
    [key: string]: any;
}

interface Suggestion {
    type: string;
    match: string;
}

interface ParsedLink {
    from: number;
    to: number;
    type: string | null;
    post: (item: string) => string;
}

interface AutocompleteContext {
    pos: number;
    explicit?: boolean;
    state: {
        sliceDoc: (from: number, to: number) => string;
    };
    matchBefore: (regex: RegExp) => { from: number; to: number; text: string };
}

interface AutocompleteResult {
    from: number;
    to?: number;
    options: Array<{ type: string; label: string }>;
}

interface MarkdownLanguageConfig {
    base: LRLanguage;
    codeLanguages?: readonly any[];
    extensions?: readonly any[];
}

/**
 * CradleEditor class that provides autocomplete and linting functionality
 * for a text editor with LSP integration
 */
export class CradleEditor {
    // Static properties for caching the LSP pack across instances
    private static packPromise: Promise<any> | null = null;
    private static cachedLspPack: LspPack | null = null;

    private lspPack: LspPack | null;
    private options: EnhancerOptions;
    private _ready: Promise<boolean>;
    private _onerror: ((error: Error) => void) | null;

    /**
     * Initialize the enhancer
     * @param {EnhancerOptions} options - Configuration options
     * @param {function|null} onerror - Error handler function
     */
    constructor(
        options: EnhancerOptions = {},
        onerror: ((error: Error) => void) | null = null,
    ) {
        this.lspPack = null;
        this.options = {
            lintDelay: 300,
            minSuggestionLength: 3,
            maxSuggestions: 10,
            ...options,
        };
        this._onerror = onerror;
        this._ready = this._initialize();
    }

    /**
     * Initialize by fetching the LSP pack.
     * Uses a static promise/cache so that only one request is made across all instances.
     * @private
     * @returns {Promise<boolean>} - Resolves when initialization is complete
     */
    private async _initialize(): Promise<boolean> {
        try {
            // If we already have a cached pack, use it.
            if (CradleEditor.cachedLspPack) {
                this.lspPack = CradleEditor.cachedLspPack;
                return true;
            }

            // Otherwise, if a request is already in progress, wait for it.
            if (!CradleEditor.packPromise) {
                CradleEditor.packPromise = fetchLspPack().then(
                    (response) => response.data,
                );
            }
            const pack = await CradleEditor.packPromise;
            this.lspPack = pack;
            CradleEditor.cachedLspPack = pack;
            return true;
        } catch (error) {
            if (this._onerror) this._onerror(error as Error);
            else throw error;
            return false;
        }
    }

    /**
     * Check if the enhancer is ready
     * @returns {Promise<boolean>} - Resolves when the enhancer is ready
     */
    ready(): Promise<boolean> {
        return this._ready;
    }

    /**
     * Get suggestions for a given word based on the LSP pack
     * @private
     * @param {string} word - The word to find suggestions for
     * @returns {Array<Suggestion>} - Array of suggestion objects
     */
    private _suggestionsForWord(word: string): Suggestion[] {
        if (!this.lspPack) return [];
        let suggestions: Suggestion[] = [];

        // Check each class type in LspPack
        for (const [type, criteria] of Object.entries(this.lspPack.classes)) {
            // Check if criteria has a regex
            if (criteria.regex) {
                const regex = new RegExp(`^${criteria.regex}$`);
                if (regex.test(word) || regex.test(word.toLowerCase())) {
                    suggestions.push({
                        type: type,
                        match: word,
                    });
                }
            }

            // Check if criteria has an enum
            if (criteria.enum) {
                const matchingEnums = criteria.enum.filter((value) =>
                    value.toLowerCase().startsWith(word.toLowerCase()),
                );
                matchingEnums.forEach((match) => {
                    suggestions.push({
                        type: type,
                        match: match,
                    });
                });
            }
        }

        // Check in instances for possible completions
        for (const [type, instances] of Object.entries(this.lspPack.instances)) {
            const matchingInstances = instances.filter((value) =>
                value.startsWith(word),
            );
            matchingInstances.forEach((match) => {
                suggestions.push({
                    type: type,
                    match: match,
                });
            });
        }

        return suggestions;
    }

    /**
     * Provides autocomplete suggestions for text outside of links
     * @private
     * @param {AutocompleteContext} context - The autocomplete context
     * @returns {Promise<AutocompleteResult> | AutocompleteResult} - Autocomplete suggestions
     */
    private _autocompleteOutsideLink(
        context: AutocompleteContext,
    ): Promise<AutocompleteResult> | AutocompleteResult {
        let word = context.matchBefore(/\S*/);
        if (word.from == word.to && !context.explicit)
            return { from: context.pos, options: [] };

        return new Promise((resolve) => {
            let suggestions = this._suggestionsForWord(word.text).map((o) => {
                return { type: 'keyword', label: `[[${o.type}:${o.match}]]` };
            });
            resolve({
                from: word.from,
                to: word.to,
                options: suggestions,
            });
        });
    }

    /**
     * Get the autocomplete extension for the editor
     * @returns {Promise<AutocompleteResult>} - Returns a function that provides autocomplete
     */
    private async _autocompleter(
        context: AutocompleteContext,
    ): Promise<AutocompleteResult> {
        await this.ready();

        let node = getLinkNode(context);
        if (node == null) return this._autocompleteOutsideLink(context);

        const linkFull = context.state.sliceDoc(node.from, node.to);
        const parsedLink = parseLink(node.from, context.pos, linkFull);
        if (parsedLink == null) return { from: context.pos, options: [] };

        let options: Array<{ label: string; type: string }> = [];

        if (parsedLink.type == null) {
            options = Object.values(this.lspPack as LspPack)
                .flatMap((obj) => Object.keys(obj))
                .map((item) => ({
                    label: parsedLink.post(item),
                    type: 'keyword',
                }));
        } else if (this.lspPack && parsedLink.type in this.lspPack['instances']) {
            options = this.lspPack['instances'][parsedLink.type].map((item) => ({
                label: parsedLink.post(item),
                type: 'keyword',
            }));
        }

        return {
            from: parsedLink.from,
            to: parsedLink.to,
            options: options,
        };
    }

    /**
     * Creates a cradle markdown language with support for [[type:value|alias]] links
     * @param {MarkdownLanguageConfig} config - Configuration for the markdown language
     * @returns {LanguageSupport} - The extended markdown language support
     */
    markdown(config: MarkdownLanguageConfig): LanguageSupport {
        const CradleLinkExtension = {
            defineNodes: [
                {
                    name: 'CradleLink',
                    style: 'Link',
                    children: [
                        {
                            name: 'CradleLinkType',
                            style: 'cradle-link-type',
                        },
                        {
                            name: 'CradleLinkValue',
                            style: 'cradle-link-value',
                        },
                        {
                            name: 'CradleLinkAlias',
                            style: 'cradle-link-alias',
                        },
                    ],
                },
                {
                    name: 'CradleLinkType',
                    style: 'link',
                },
                {
                    name: 'CradleLinkValue',
                    style: 'link',
                },
                {
                    name: 'CradleLinkAlias',
                    style: 'link',
                }
            ],
            parseInline: [
                {
                    name: 'CradleLink',
                    before: 'Link',
                    parse(cx: any, next: any, pos: number) {
                        // Check for opening brackets "[["
                        if (next !== 91 || cx.char(pos + 1) !== 91) return -1;

                        let end = pos + 2;
                        let content = '';

                        // Loop until we find the closing "]]"
                        while (end < cx.end) {
                            if (cx.char(end) === 93 && cx.char(end + 1) === 93) {
                                // Found the closing "]]"
                                const link = content;
                                const linkRegex = /^([^:]+):([^|]+)(?:\|(.+))?$/;
                                const match = link.match(linkRegex);

                                if (match) {
                                    const linkType = match[1].trim();
                                    const linkValue = match[2].trim();
                                    const linkAlias = match[3] ? match[3].trim() : null;

                                    const node = cx.elt('CradleLink', pos, end + 2, []);

                                    node.children = [
                                        cx.elt('CradleLinkType', pos, pos + linkType.length + 1),
                                        cx.elt('CradleLinkValue', pos + linkType.length + 2, pos + linkType.length + linkValue.length + 3),
                                    ];
                                    if (linkAlias) {
                                        node.children.push(
                                        cx.elt('CradleLinkAlias', pos + linkType.length + 1 + linkValue.length, end),
                                        )
                                    }

                                    return cx.append(node);
                                }
                                return -1;
                            }
                            content += String.fromCharCode(cx.char(end));
                            end++;
                        }
                        return -1;
                    },
                },
            ],
        };

        // Create the language support with all extensions
        return markdown({
            base: markdownLanguage,
            codeLanguages: config.codeLanguages || [],
            extensions: [CradleLinkExtension, ...(config.extensions || [])],
        });
    }

    /**
     * Get the autocomplete configuration for markdown language
     * @returns {Promise<any>} - Autocomplete configuration
     */
    autocomplete(): any {
        return markdownLanguage.data.of({
            autocomplete: this._autocompleter.bind(this),
        });
    }

    /**
     * Auto-format links in the provided text.
     * If an editor instance is provided, only nodes of type "CradleLink" are reformatted.
     * Otherwise, it falls back to the original behavior.
     * @param {string} text - The text to format
     * @param {any} [editor] - (Optional) A CodeMirror React editor instance to use for node analysis.
     * @returns {string} - The formatted text with links
     */
    autoFormatLinks(editor: any, start: number, end: number): string {
        const trimWord = (x: string): string => x.replace(/^[,.:\s]+|[,.:\s]+$/g, '');

        // If an editor instance is provided and it supports syntax tree access
        if (editor && editor.state && typeof syntaxTree === 'function') {
            const tree = syntaxTree(editor.state);
            // Collect changes as {from, to, replacement}
            const changes: Array<{ from: number; to: number; replacement: string }> =
                [];

            tree.iterate({
                enter: (node: any) => {
                    console.log(node.name);
                    console.log(node);
                    return;
                    if (node.name === 'CradleLink') {
                        const nodeText = text.substring(node.from, node.to);
                        // Use suggestions to see if the node text should be formatted.
                        const suggestions = this._suggestionsForWord(nodeText);
                        // Look for a suggestion that exactly matches after trimming.
                        const match = suggestions.find(
                            (x) => trimWord(x.match) === trimWord(nodeText),
                        );
                        if (match) {
                            const replacement = `[[${match.type}:${match.match}]]`;
                            changes.push({ from: node.from, to: node.to, replacement });
                        }
                    }
                },
            });

            // Apply changes in reverse order to avoid messing up offsets.
            changes.sort((a, b) => b.from - a.from);
            let formattedText = text;
            for (const change of changes) {
                formattedText =
                    formattedText.slice(0, change.from) +
                    change.replacement +
                    formattedText.slice(change.to);
            }
            return formattedText;
        }

        // Fallback: process entire text word by word (original behavior)
        const words = text.split(/(\s+)/);
        let linkedMarkdown = text;
        let position = 0;

        words.forEach((word) => {
            if (trimWord(word)) {
                const start = position;
                const end = start + word.length;
                let suggestions = this._suggestionsForWord(trimWord(word));
                suggestions = suggestions.filter(
                    (x) => trimWord(x.match) === trimWord(word),
                );
                if (suggestions && suggestions.length >= 1) {
                    const link = `[[${suggestions[0].type}:${suggestions[0].match}]]`;
                    linkedMarkdown =
                        linkedMarkdown.substring(0, start) +
                        link +
                        linkedMarkdown.substring(end);
                    position += link.length - word.length;
                }
            }
            position += word.length;
        });
        return linkedMarkdown;
    }
}
