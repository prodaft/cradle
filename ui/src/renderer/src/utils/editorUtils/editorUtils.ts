import { Diagnostic, linter } from '@codemirror/lint';
import { fetchLspPack } from '../../services/queryService/queryService';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { LanguageSupport, LRLanguage, syntaxTree } from '@codemirror/language';
import { EditorState } from '@uiw/react-codemirror';
import { tags } from '@codemirror/highlight';

/*==============================================================================
  INTERFACES
==============================================================================*/
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
    Static Properties (Cache for LSP Pack)
  ---------------------------------------------------------------------------*/
  private static packPromise: Promise<any> | null = null;
  private static cachedLspPack: LspPack | null = null;

  /*---------------------------------------------------------------------------
    Instance Properties
  ---------------------------------------------------------------------------*/
  private lspPack: LspPack | null;
  private options: EnhancerOptions;
  private _ready: Promise<boolean>;
  private _onError: ((error: Error) => void) | null;

  /*---------------------------------------------------------------------------
    Constructor & Initialization
  ---------------------------------------------------------------------------*/
  constructor(options: EnhancerOptions = {}, onError: ((error: Error) => void) | null = null) {
    this.lspPack = null;
    this.options = {
      lintDelay: 300,
      minSuggestionLength: 3,
      maxSuggestions: 10,
      ...options,
    };
    this._onError = onError;
    this._ready = this.initializePack();
  }

  /**
   * Wait until the LSP pack is fetched and cached.
   * Uses static caching to ensure only one fetch is made.
   */
  private async initializePack(): Promise<boolean> {
    try {
      if (CradleEditor.cachedLspPack) {
        this.lspPack = CradleEditor.cachedLspPack;
        return true;
      }
      if (!CradleEditor.packPromise) {
        CradleEditor.packPromise = fetchLspPack().then(response => response.data);
      }
      const pack = await CradleEditor.packPromise;
      this.lspPack = pack;
      CradleEditor.cachedLspPack = pack;
      return true;
    } catch (error) {
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
   * Private helper to collect suggestions for a given word.
   */
  private getSuggestionsForWord(word: string): Suggestion[] {
    if (!this.lspPack) return [];
    const suggestions: Suggestion[] = [];
    const madeSuggestions = new Set<string>();

    // Process class-based suggestions
    for (const [type, criteria] of Object.entries(this.lspPack.classes)) {
      if (criteria.regex) {
        const regex = new RegExp(`^${criteria.regex}$`);
        if (regex.test(word) || regex.test(word.toLowerCase())) {
          suggestions.push({ type, match: word });
          madeSuggestions.add(`${type}:${word}`);
        }
      }
      else if (criteria.enum) {
        const matchingEnums = criteria.enum.filter(enumValue =>
          enumValue.toLowerCase().startsWith(word.toLowerCase())
        );
        matchingEnums.forEach(match => {
          suggestions.push({ type, match });
          madeSuggestions.add(`${type}:${match}`);
        });
      }
    }

    // Process instance-based suggestions
    for (const [type, instances] of Object.entries(this.lspPack.instances)) {
      const matchingInstances = instances.filter(value => value.startsWith(word));
      matchingInstances.forEach(match => {
        if (!madeSuggestions.has(`${type}:${match}`)) {
          suggestions.push({ type, match });
          madeSuggestions.add(`${type}:${match}`);
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

    const suggestions = this.getSuggestionsForWord(word.text).map(s =>
      ({ type: 'keyword', label: `[[${s.type}:${s.match}]]` })
    );

    return {
      from: word.from,
      to: word.to,
      options: suggestions,
    };
  }

  /**
   * Provides autocomplete suggestions based on the cursor context.
   */
  private async provideAutocompleteSuggestions(context: AutocompleteContext): Promise<AutocompleteResult> {
    await this.ready();
    if (!this.lspPack) return { from: context.pos, options: [] };

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
          to = node.lastChild.to + 1;
          ratchet = true;
        }
        from = to;
        // fall through
      case 'CradleLinkType':
        if (!ratchet) {
          options = Object.values(this.lspPack)
            .flatMap(obj => Object.keys(obj))
            .map(item => ({
              label: item + (node.nextSibling ? '' : ':'),
              info: 'Test',
              type: 'keyword',
            }));
          break;
        }
        ratchet = false;
        // fall through
      case 'CradleLinkValue': {
        const sibling = node.name === 'CradleLink' ? node.firstChild : node.prevSibling;
        if (!sibling) break;
        const t = context.state.doc.sliceString(sibling.from, sibling.to);
        if (!this.lspPack.instances[t]) break;
        options = this.lspPack.instances[t].map(item => ({
          label: item,
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
      if (!this.lspPack) return [];

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
            // Validate link type.
            const nodeText = text.slice(node.from, node.to);
            const matches = Object.values(this.lspPack as LspPack)
              .flatMap((obj) => Object.keys(obj))
              .filter(x => x === nodeText);
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
            diagnostics.push(...this.validateLinkValue(t, value, node.from));
            return false;
          } else if (node.name === 'CradleLink') {
            return true;
          } else if (node.name === 'CradleLinkAlias') {
            return false;
          }

          // Process plain text nodes for possible suggestions.
          if (!node.firstChild) {
            const nodeText = text.slice(node.from, node.to);
            const regex = /\S+/g;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(nodeText)) !== null) {
              const word = match[0];
              const trimmed = word.replace(/^[,.:\s]+|[,.:\s]+$/g, '');
              if (!trimmed) continue;
              const suggestions = this.getSuggestionsForWord(trimmed);
              for (const suggestion of suggestions) {
                diagnostics.push({
                  from: node.from + match.index,
                  to: node.from + match.index + word.length,
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
  private validateLinkValue(linkType: string, value: string, from: number): Diagnostic[] {
    if (!this.lspPack) return [];
    const diagnostics: Diagnostic[] = [];
    const criteria = this.lspPack.classes[linkType];
    if (!criteria) return [];

    if (criteria.regex) {
      const regex = new RegExp(`^${criteria.regex}$`);
      if (!(regex.test(value) || regex.test(value.toLowerCase()))) {
        diagnostics.push({
          from,
          to: from + value.length,
          severity: 'error',
          message: `${value} does not fit ${linkType}'s regex!`,
        });
      }
    }

    if (criteria.enum) {
      // Avoid shadowing variable names by renaming the callback variable.
      const matchingEnums = criteria.enum.filter(enumVal =>
        enumVal.toLowerCase().startsWith(value.toLowerCase())
      );
      if (matchingEnums.length === 0) {
        diagnostics.push({
          from,
          to: from + value.length,
          severity: 'error',
          message: `${value} is not a valid enum value!`,
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
            { name: 'CradleLinkType', style: 'cradle-link-type' },
            { name: 'CradleLinkValue', style: 'cradle-link-value' },
            { name: 'CradleLinkAlias', style: 'cradle-link-alias' },
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
            node.children.push(cx.elt('CradleLinkType', start, start + linkType.length));
            if (linkValue !== null) {
              const valueStart = start + linkType.length + 1;
              node.children.push(cx.elt('CradleLinkValue', valueStart, valueStart + linkValue.length));
              if (linkAlias) {
                const aliasStart = valueStart + linkValue.length + 1;
                node.children.push(cx.elt('CradleLinkAlias', aliasStart, aliasStart + linkAlias.length));
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
    const trimWord = (x: string): string => x.replace(/^[,.:\s]+|[,.:\s]+$/g, '');
    const tree = syntaxTree(editor.state);
    const changes: Array<{ from: number; to: number; replacement: string }> = [];
    const ignoreTypes = new Set(['CradleLink', 'CodeBlock', 'FencedCode', 'InlineCode']);

    tree.iterate({
      from: start,
      to: end,
      enter: (syntaxNode: any) => {
        const node = syntaxNode.node;
        if (ignoreTypes.has(node.name)) return false;
        if (!node.firstChild) {
          const nodeText = text.slice(node.from, node.to);
          if (!nodeText.trim()) return;
          const regex = /\S+/g;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(nodeText)) !== null) {
            const word = match[0];
            const absoluteStart = node.from + match.index;
            const absoluteEnd = absoluteStart + word.length;
            const trimmed = trimWord(word);
            if (trimmed.length === 0) continue;
            const suggestions = this.getSuggestionsForWord(trimmed);
            if (suggestions.length == 1) {
              const suggestion = suggestions.find(s => trimWord(s.match) === trimmed);
              if (suggestion) {
                const replacement = `[[${suggestion.type}:${suggestion.match}]]`;
                changes.push({ from: absoluteStart, to: absoluteEnd, replacement });
              }
            }
          }
        }
      },
    });

    // Apply changes in reverse to avoid offset issues.
    changes.sort((a, b) => b.from - a.from);
    let formattedText = text;
    for (const change of changes) {
      formattedText = formattedText.slice(0, change.from) + change.replacement + formattedText.slice(change.to);
    }
    return formattedText;
  }
}
