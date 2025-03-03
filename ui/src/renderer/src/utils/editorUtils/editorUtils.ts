import { Diagnostic, linter } from '@codemirror/lint';
import {
    fetchLspTypes,
    fetchCompletionTries,
} from '../../services/queryService/queryService';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { LanguageSupport, LRLanguage, syntaxTree } from '@codemirror/language';
import { EditorState } from '@uiw/react-codemirror';
import { tags } from '@codemirror/highlight';
import { Trie } from './trie';

/*==============================================================================
  HELPER FUNCTIONS
==============================================================================*/

/**
 * Replaces all '/' characters in a string with double underscores ('__').
 * Example: "path/to/example" becomes "path__to__example".
 */
function replaceSlashWithDoubleUnderscore(str: string): string {
    return str.replace(/\//g, '__');
}

/**
 * Replaces all double underscores ('__') in a string with '/' characters.
 * Example: "path__to__example" becomes "path/to/example".
 */
function replaceDoubleUnderscoreWithSlash(str: string): string {
    return str.replace(/__/g, '/');
}

/*==============================================================================
  INTERFACES
==============================================================================*/
interface EnhancerOptions {
    lintDelay?: number;
    minSuggestionLength?: number;
    maxSuggestions?: number;
    [key: string]: any;
}

type LspEntryClass = {
    type: string;
    subtype: string;
    description: string;
    regex: string | null;
    options: string[];
    color: string;
};

interface Suggestion {
    from: int;
    type: string;
    match: string;
}

interface AutocompleteContext {
    pos: number;
    explicit?: boolean;
    state: EditorState;
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

/*==============================================================================
  CRADLE EDITOR CLASS
  Provides autocomplete, linting, markdown integration, and link auto-
  formatting functionalities for a text editor with LSP integration.
==============================================================================*/
export class CradleEditor {
    /*---------------------------------------------------------------------------
    Static Properties (Cache for EntryClasses and Tries)
  ---------------------------------------------------------------------------*/
    private static entryClassesPromise: Promise<any> | null = null;
    private static cachedEntryClasses: { [key: string]: LspEntryClass } | null = null;

    private static triesPromise: Promise<any> | null = null;
    private static cachedTries: { [key: string]: Trie } | null = null;

    private static cachedBigTrie: Trie | null = null;

    /*---------------------------------------------------------------------------
    Instance Properties
  ---------------------------------------------------------------------------*/
    private entryClasses: { [key: string]: LspEntryClass } | null;
    private tries: { [key: string]: Trie } | null;
    private bigTrie: Trie | null;
    private _ready: Promise<boolean>;
    private _onError: ((error: Error) => void) | null;
    private _onLspLoaded: (bool: boolean) => void;

    private combinedRegex: RegExp | null = null; // for scanning large text
    private combinedWordRegex: RegExp | null = null; // for whole-word matching

    /*---------------------------------------------------------------------------
    Constructor & Initialization
  ---------------------------------------------------------------------------*/
    constructor(
        options: EnhancerOptions = {},
        onLspLoaded: (bool: boolean) => void,
        onError: ((error: Error) => void) | null = null,
    ) {
        this.entryClasses = null;
        this.tries = null;
        this._onError = onError;
        this._onLspLoaded = onLspLoaded;
        this._ready = this.initializeEntryClassesAndTries().then((ready) => {
            this._onLspLoaded(ready);
            return ready;
        });
    }

    /**
     * Creates the combined regex patterns from all entry classes that define a regex.
     * Builds two regexes:
     *  - combinedRegex: used to scan larger texts (with global & ignore-case flags)
     *  - combinedWordRegex: used for whole-word matching (anchored with ^ and $)
     */
    private buildCombinedRegex(): void {
        if (!this.entryClasses) return;
        const patterns: string[] = [];
        for (const [type, criteria] of Object.entries(this.entryClasses)) {
            if (criteria.regex) {
                // Wrap each pattern in a named capturing group using the entry type.
                patterns.push(
                    `(?<${replaceSlashWithDoubleUnderscore(type)}>${criteria.regex})`,
                );
            }
        }
        if (patterns.length > 0) {
            const pattern = patterns.join('|');
            this.combinedRegex = new RegExp(pattern, 'gi'); // For scanning text
            this.combinedWordRegex = new RegExp(`^(?:${pattern})$`, 'i'); // For matching whole words
        }
    }

    /**
     * Wait until the entry classes and tries are fetched and cached.
     * Uses static caching to ensure only one fetch is made.
     */
    private async initializeEntryClassesAndTries(): Promise<boolean> {
        try {
            // Fetch entry classes
            if (CradleEditor.cachedEntryClasses) {
                this.entryClasses = CradleEditor.cachedEntryClasses;
            } else {
                if (!CradleEditor.entryClassesPromise) {
                    CradleEditor.entryClassesPromise = fetchLspTypes().then(
                        (response) => response.data,
                    );
                }
                const entryClasses = await CradleEditor.entryClassesPromise;
                this.entryClasses = entryClasses;
                CradleEditor.cachedEntryClasses = entryClasses;
            }

            // Fetch tries
            if (CradleEditor.cachedTries) {
                this.tries = CradleEditor.cachedTries;
            } else {
                if (!CradleEditor.triesPromise) {
                    CradleEditor.triesPromise = fetchCompletionTries().then(
                        (response) => {
                            const tries: { [key: string]: Trie<null> } = {};
                            for (const [type, trie] of Object.entries(response.data)) {
                                tries[type] = Trie.deserialize(trie, type);
                            }
                            return tries;
                        },
                    );
                }
                const tries = await CradleEditor.triesPromise;
                this.tries = tries;
                CradleEditor.cachedTries = tries;
            }

            if (CradleEditor.cachedBigTrie) {
                this.bigTrie = CradleEditor.cachedBigTrie;
            } else {
                const bigTrie = Trie.merge(Object.values(this.tries));
                for (const entryClass of Object.values(this.entryClasses)) {
                    if (entryClass.options) {
                        for (const option of entryClass.options) {
                            bigTrie.insert(option, [entryClass.subtype]);
                        }
                    }
                }

                this.bigTrie = bigTrie;
                CradleEditor.cachedBigTrie = bigTrie;
            }

            this.buildCombinedRegex();
            return true;
        } catch (error) {
            console.log(error);
            if (this._onError) this._onError(error as Error);
            else throw error;
            return false;
        }
    }

    /**
     * Returns a promise that resolves when the editor is ready.
     */
    ready(): Promise<boolean> {
        return this._ready;
    }

    /*============================================================================
    AUTOCOMPLETE METHODS
  =============================================================================*/

    /**
     * Public method to retrieve the autocomplete extension.
     * It registers the autocomplete function with the markdown language.
     */
    autocomplete(): any {
        return markdownLanguage.data.of({
            autocomplete: this.provideAutocompleteSuggestions.bind(this),
        });
    }

    /**
     * Returns suggestions for a chunk of text using an optimized approach.
     * This method first builds a combined regex with named groups from all entry classes
     * that have a regex. Then it runs a simplified Aho–Corasick algorithm using the bigTrie.
     */
    private getSuggestionsForText(text: string): Suggestion[] {
        if (!this.combinedRegex) return [];
        const suggestions: Suggestion[] = [];
        const madeSuggestions = new Set<string>();

        // 1. Process class-based suggestions using a combined regex with named groups.
        let match: RegExpExecArray | null;
        while ((match = this.combinedRegex.exec(text)) !== null) {
            if (match.groups) {
                // Iterate over all named groups to see which one matched.
                for (const [groupName, groupMatch] of Object.entries(match.groups)) {
                    if (groupMatch) {
                        const type = replaceDoubleUnderscoreWithSlash(groupName);
                        const matchText = groupMatch;
                        const key = `${type}:${matchText}`;
                        if (!madeSuggestions.has(key)) {
                            suggestions.push({
                                type,
                                match: matchText.trimEnd(),
                                from: match.index, // use regex match index
                            });
                            madeSuggestions.add(key);
                        }
                        break;
                    }
                }
            }
        }

        if (!this.bigTrie) return [];

        // 2. Process instance-based suggestions using a simplified Aho–Corasick search on the bigTrie.
        for (let i = 0; i < text.length; i++) {
            let currentNode = this.bigTrie.root;
            let j = i;
            while (j < text.length) {
                const char = text[j];
                if (!currentNode.children[char]) break;
                currentNode = currentNode.children[char];
                if (currentNode.eow && currentNode.data) {
                    const word = text.substring(i, j + 1);
                    for (const type of currentNode.data) {
                        const key = `${type}:${word}`;
                        if (!madeSuggestions.has(key)) {
                            suggestions.push({
                                type,
                                match: word,
                                from: i, // starting index from the loop variable
                            });
                            madeSuggestions.add(key);
                        }
                    }
                }
                j++;
            }
        }

        return suggestions;
    }

    private getSuggestionsForWord(word: string): Suggestion[] {
        if (!this.entryClasses) return [];
        const suggestions: Suggestion[] = [];
        const madeSuggestions = new Set<string>();

        // 1. Use the combinedWordRegex to check for a full match against class-based regex patterns.
        if (this.combinedWordRegex) {
            const match = this.combinedWordRegex.exec(word);
            if (match && match.groups) {
                for (const [groupName, groupMatch] of Object.entries(match.groups)) {
                    if (groupMatch) {
                        const key = `${groupName}:${word}`;
                        if (!madeSuggestions.has(key)) {
                            suggestions.push({ type: groupName, match: word });
                            madeSuggestions.add(key);
                        }
                        break; // Only one group can match a full word.
                    }
                }
            }
        }

        // 2. Process instance-based suggestions using the bigTrie.
        if (this.bigTrie) {
            const matchingInstances = this.bigTrie.allWordsWithPrefix(word);
            matchingInstances.forEach((matchObj) => {
                for (const type of matchObj.types) {
                    const key = `${type}:${matchObj.word}`;
                    if (!madeSuggestions.has(key)) {
                        suggestions.push({ type, match: matchObj.word });
                        madeSuggestions.add(key);
                    }
                }
            });
        }

        return suggestions;
    }

    /**
     * Provides autocomplete suggestions when the cursor is outside a link.
     */
    private autocompleteForPlainText(context: AutocompleteContext): AutocompleteResult {
        const word = context.matchBefore(/\S*/);
        if (word.from === word.to && !context.explicit)
            return { from: context.pos, options: [] };

        const suggestions = this.getSuggestionsForWord(word.text).map((s) => ({
            type: 'keyword',
            label: `[[${s.type}:${s.match}]]`,
        }));

        return {
            from: word.from,
            to: word.to,
            options: suggestions,
        };
    }

    /**
     * Provides autocomplete suggestions based on the cursor context.
     */
    private async provideAutocompleteSuggestions(
        context: AutocompleteContext,
    ): Promise<AutocompleteResult> {
        await this.ready();
        if (!this.entryClasses) return { from: context.pos, options: [] };

        const pos = context.pos;
        const tree = syntaxTree(context.state);
        let node = tree.resolve(pos, -1);

        let options: Array<{ label: string; type: string }> = [];
        let from = node.from;
        let to = node.to;
        let ratchet = false;

        switch (node.name) {
            case 'CradleLink':
                if (!node.lastChild || node.lastChild.name === 'CradleLinkType') {
                    to -= 2;
                } else if (node.lastChild.name === 'CradleLinkValue') {
                    to = node.lastChild.to;
                    ratchet = true;
                }
                from = to;
            case 'CradleLinkType':
                if (!ratchet) {
                    options = Object.keys(this.entryClasses).map((item) => ({
                        label: item + (node.nextSibling ? '' : ':'),
                        info: this.entryClasses[item].description
                            ? this.entryClasses[item].description
                            : '',
                        type: 'keyword',
                    }));
                    break;
                }
                ratchet = false;
            // fall through
            case 'CradleLinkValue': {
                if (!this.tries) return { from: context.pos, options: [] };
                const sibling =
                    node.name === 'CradleLink' ? node.firstChild : node.prevSibling;
                if (!sibling) break;
                const t = context.state.doc.sliceString(sibling.from, sibling.to);
                if (!this.tries[t]) break;

                const v = context.state.doc.sliceString(from, to);
                options = this.tries[t].allWordsWithPrefix(v).map((item) => ({
                    label: item.word,
                    type: 'keyword',
                }));
                break;
            }
            case 'CradleLinkAlias':
                break;
            default:
                // For headings, paragraphs, or table cells, use plain text autocomplete.
                if (!node.name.includes('Heading')) break;
            case 'Paragraph':
            case 'TableCell':
                return this.autocompleteForPlainText(context);
        }

        return { from, to, options };
    }

    /*============================================================================
    LINTING METHODS
  =============================================================================*/

    /**
     * Returns a CodeMirror lint extension that checks for valid cradle links and
     * suggests link formatting.
     */
    lint(): any {
        return linter(async (view) => {
            await this.ready();
            if (!this.entryClasses) return [];

            const diagnostics: Diagnostic[] = [];
            const text = view.state.doc.toString();
            const tree = syntaxTree(view.state);
            const ignoreTypes = new Set(['CodeBlock', 'FencedCode', 'InlineCode']);

            tree.iterate({
                from: 0,
                to: view.state.doc.length,
                enter: (syntaxNode) => {
                    const node = syntaxNode.node;
                    if (ignoreTypes.has(node.name)) return false;

                    if (node.name === 'CradleLinkType') {
                        if (!this.entryClasses) return false;

                        const nodeText = text.slice(node.from, node.to);
                        const matches = Object.keys(this.entryClasses).filter(
                            (x) => x === nodeText,
                        );
                        if (matches.length === 0) {
                            diagnostics.push({
                                from: node.from,
                                to: node.to,
                                severity: 'error',
                                message: `Invalid link type: ${nodeText}`,
                            });
                        }
                        return false;
                    } else if (node.name === 'CradleLinkValue') {
                        // Validate link value.
                        const sibling = node.prevSibling;
                        if (!sibling) return false;
                        const t = text.slice(sibling.from, sibling.to);
                        const value = text.slice(node.from, node.to);
                        diagnostics.push(
                            ...this.validateLinkValue(t, value, node.from),
                        );
                        return false;
                    } else if (node.name === 'CradleLink') {
                        return true;
                    } else if (node.name === 'CradleLinkAlias') {
                        return false;
                    }

                    if (!node.firstChild) {
                        const nodeText = text.slice(node.from, node.to);
                        const suggestions = this.getSuggestionsForText(nodeText);
                        suggestions.forEach((suggestion) => {
                            let searchIndex = 0;
                            while (true) {
                                const idx = suggestion.from;
                                if (idx === -1) break;
                                diagnostics.push({
                                    from: node.from + idx,
                                    to: node.from + idx + suggestion.match.length,
                                    severity: 'warning',
                                    message: `Possible link: [[${suggestion.type}:${suggestion.match}]]`,
                                    actions: [
                                        {
                                            name: 'Link',
                                            apply(view, from, to) {
                                                view.dispatch({
                                                    changes: {
                                                        from,
                                                        to,
                                                        insert: `[[${suggestion.type}:${suggestion.match}]]`,
                                                    },
                                                });
                                            },
                                        },
                                    ],
                                });
                                searchIndex = idx + suggestion.match.length;
                            }
                        });
                    } else if (node.name === 'Paragraph') {
                        const nodeText = text.slice(node.from, node.to);
                        if (!nodeText.trim()) return;

                        // Get all suggestions for the entire node text.
                        const suggestions = this.getSuggestionsForText(nodeText);

                        const childRanges: Array<{ from: number; to: number }> = [];
                        if (node.firstChild) {
                            let child = node.firstChild;
                            while (child) {
                                childRanges.push({ from: child.from, to: child.to });
                                child = child.nextSibling;
                            }
                        }
                        for (const suggestion of suggestions) {
                            const start = node.from + suggestion.from;
                            const end = start + suggestion.match.length;
                            const liesWithinChild = childRanges.some(
                                (range) => start >= range.from && end <= range.to,
                            );
                            if (liesWithinChild) continue;

                            diagnostics.push({
                                from: start,
                                to: end,
                                severity: 'warning',
                                message: `Possible link: [[${suggestion.type}:${suggestion.match}]]`,
                                actions: [
                                    {
                                        name: 'Link',
                                        apply(view, from, to) {
                                            view.dispatch({
                                                changes: {
                                                    from,
                                                    to,
                                                    insert: `[[${suggestion.type}:${suggestion.match}]]`,
                                                },
                                            });
                                        },
                                    },
                                ],
                            });
                        }
                    }
                },
            });

            return diagnostics;
        });
    }

    /**
     * Validates a link value against its corresponding criteria.
     * Returns an array of diagnostics if the value does not match regex or enums.
     */
    private validateLinkValue(
        linkType: string,
        value: string,
        from: number,
    ): Diagnostic[] {
        if (!this.entryClasses) return [];
        const diagnostics: Diagnostic[] = [];

        const criteria = this.entryClasses[linkType];
        if (!criteria) return [];

        if (criteria.regex) {
            const regex = new RegExp(`^${criteria.regex}$`);
            if (!(regex.test(value) || regex.test(value.toLowerCase()))) {
                diagnostics.push({
                    from,
                    to: from + value.length,
                    severity: 'error',
                    message: `${value} does not match ${linkType}'s regex!`,
                });
            }
        }

        if (criteria.options) {
            // Avoid shadowing variable names by renaming the callback variable.
            const matchingEnums = criteria.options.filter((enumVal) =>
                enumVal.toLowerCase().startsWith(value.toLowerCase()),
            );
            if (matchingEnums.length === 0) {
                diagnostics.push({
                    from,
                    to: from + value.length,
                    severity: 'error',
                    message: `${value} is not a valid option for ${linkType}!`,
                });
            }
        }

        // TODO: Check for non-existent entities.
        return diagnostics;
    }

    /*============================================================================
    MARKDOWN LANGUAGE INTEGRATION
  =============================================================================*/

    /**
     * Creates a cradle markdown language with support for [[type:value|alias]] links.
     */
    markdown(config: MarkdownLanguageConfig): LanguageSupport {
        const CradleLinkExtension = {
            defineNodes: [
                {
                    name: 'CradleLink',
                    style: [tags.squareBracket],
                    children: [
                        { name: 'CradleLinkType' },
                        { name: 'CradleLinkValue' },
                        { name: 'CradleLinkAlias' },
                    ],
                },
                { name: 'CradleLinkType', style: [tags.string] },
                { name: 'CradleLinkValue', style: [tags.strong] },
                { name: 'CradleLinkAlias', style: [tags.emphasis] },
            ],
            parseInline: [
                {
                    name: 'CradleLink',
                    before: 'Link',
                    parse(cx, next, pos) {
                        // Check for opening "[["
                        if (next !== 91 || cx.char(pos + 1) !== 91) return -1;
                        const start = pos + 2;
                        let end = start;
                        while (end < cx.end) {
                            if (cx.char(end) === 93 && cx.char(end + 1) === 93) break;
                            end++;
                        }
                        if (end >= cx.end) return -1;
                        let content = '';
                        for (let i = start; i < end; i++) {
                            content += String.fromCharCode(cx.char(i));
                        }
                        let linkType = '';
                        let linkValue: string | null = null;
                        let linkAlias: string | null = null;
                        const colonIndex = content.indexOf(':');
                        if (colonIndex === -1) {
                            linkType = content.trim();
                        } else {
                            linkType = content.slice(0, colonIndex).trim();
                            const remainder = content.slice(colonIndex + 1);
                            const pipeIndex = remainder.indexOf('|');
                            if (pipeIndex === -1) {
                                linkValue = remainder.trim();
                            } else {
                                linkValue = remainder.slice(0, pipeIndex).trim();
                                linkAlias = remainder.slice(pipeIndex + 1).trim();
                            }
                        }
                        const node = cx.elt('CradleLink', pos, end + 2, []);
                        node.children.push(
                            cx.elt('CradleLinkType', start, start + linkType.length),
                        );
                        if (linkValue !== null) {
                            const valueStart = start + linkType.length + 1;
                            node.children.push(
                                cx.elt(
                                    'CradleLinkValue',
                                    valueStart,
                                    valueStart + linkValue.length,
                                ),
                            );
                            if (linkAlias) {
                                const aliasStart = valueStart + linkValue.length + 1;
                                node.children.push(
                                    cx.elt(
                                        'CradleLinkAlias',
                                        aliasStart,
                                        aliasStart + linkAlias.length,
                                    ),
                                );
                            }
                        }
                        return cx.append(node);
                    },
                },
            ],
        };

        return markdown({
            base: markdownLanguage,
            codeLanguages: config.codeLanguages || [],
            extensions: [CradleLinkExtension, ...(config.extensions || [])],
        });
    }

    /*============================================================================
    AUTO-FORMAT LINK METHODS
  =============================================================================*/

    /**
     * Auto-formats plain text into cradle links where applicable.
     */

    autoFormatLinks(editor: any, start: number, end: number): string {
        const text: string = editor.state.doc.toString();
        const tree = syntaxTree(editor.state);
        const changes: Array<{ from: number; to: number; replacement: string }> = [];
        const ignoreTypes = new Set([
            'Link',
            'CradleLink',
            'CodeBlock',
            'FencedCode',
            'InlineCode',
        ]);

        // Utility to trim punctuation and whitespace from a word.
        const trimWord = (x: string): string => x.replace(/^[,.:\s]+|[,.:\s]+$/g, '');

        tree.iterate({
            from: start,
            to: end,
            enter: (syntaxNode: any) => {
                const node = syntaxNode.node;
                const nodeText = text.slice(node.from, node.to);
                if (ignoreTypes.has(node.name)) return false;
                if (!node.firstChild) {
                    if (!nodeText.trim()) return;

                    // Get all suggestions for the entire node text.
                    const suggestions = this.getSuggestionsForText(nodeText);

                    // Group suggestions by the trimmed (and lowercased) match.
                    const grouped: Map<string, Suggestion[]> = new Map();
                    for (const s of suggestions) {
                        const key = s.match.trim().toLowerCase();
                        if (!grouped.has(key)) {
                            grouped.set(key, []);
                        }
                        grouped.get(key)!.push(s);
                    }
                } else if (node.name === 'Paragraph') {
                    if (!nodeText.trim()) return;

                    // Get all suggestions for the entire node text.
                    const suggestions = this.getSuggestionsForText(nodeText);

                    const childRanges: Array<{ from: number; to: number }> = [];
                    if (node.firstChild) {
                        let child = node.firstChild;
                        while (child) {
                            childRanges.push({ from: child.from, to: child.to });
                            child = child.nextSibling;
                        }
                    }
                    for (const suggestion of suggestions) {
                        const replacement = `[[${suggestion.type}:${suggestion.match}]]`;
                        const absoluteStart = start + suggestion.from;
                        const absoluteEnd = absoluteStart + suggestion.match.length;
                        // Deny suggestion if it lies entirely within any child node.
                        const liesWithinChild = childRanges.some(
                            (range) =>
                                absoluteStart >= range.from && absoluteEnd <= range.to,
                        );
                        if (liesWithinChild) continue;

                        changes.push({
                            from: absoluteStart,
                            to: absoluteEnd,
                            replacement,
                        });
                    }
                }
            },
        });

        // Apply changes in reverse order to avoid offset issues.
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
}
