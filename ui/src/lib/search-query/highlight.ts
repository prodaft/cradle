// Tokenizes the whole search-bar string (qualifiers and all) purely for display -- coloring each
// piece of syntax as the user types. Lenient by design (never throws, always renders something,
// even mid-typing an invalid expression); search-schema.ts/query-lang.ts own validation.

export type HighlightKind =
    | 'space'
    | 'qualifier'
    | 'keyword'
    | 'phrase'
    | 'exact'
    | 'wildcard'
    | 'paren'
    | 'word';

interface HighlightSpan {
    text: string;
    kind: HighlightKind;
}

const KEYWORDS = new Set(['AND', 'OR', 'NOT']);

// Sticky ('y'). As in search-schema.ts's tokenizer, a qualifier only starts at the beginning,
// after whitespace, a parenthesis or a quote, so `=status:x` stays an exact term. The quoted-value
// qualifier alternative must be tried before the bare-value one, or `status:"in progress"` would
// get cut off at its internal space. Exact `="…"` is matched before a bare phrase so the `=`
// stays attached.
const HIGHLIGHT_TOKEN_RE =
    /(\s+)|((?<![^\s()"])-?[a-zA-Z_][a-zA-Z0-9_.]*:"(?:[^"\\]|\\.)*")|((?<![^\s()"])-?[a-zA-Z_][a-zA-Z0-9_.]*:[^\s()"]*)|(="(?:[^"\\]|\\.)*")|("(?:[^"\\]|\\.)*")|(\()|(\))|(=)|(-(?=\S))|([^\s()"]+)/y;

function qualifierKey(token: string): string {
    return token.slice(0, token.indexOf(':')).toLowerCase();
}

export function tokenizeForHighlight(
    raw: string,
    qualifierKeys: ReadonlySet<string>,
): HighlightSpan[] {
    const spans: HighlightSpan[] = [];
    let pos = 0;
    while (pos < raw.length) {
        HIGHLIGHT_TOKEN_RE.lastIndex = pos;
        const match = HIGHLIGHT_TOKEN_RE.exec(raw);
        if (!match) {
            spans.push({ text: raw.slice(pos), kind: 'word' });
            break;
        }
        const [
            full,
            space,
            qualifierQuoted,
            qualifierBare,
            exactQuoted,
            phrase,
            lparen,
            rparen,
            equals,
            minus,
            word,
        ] = match;
        const qualifier = qualifierQuoted ?? qualifierBare;
        if (space) {
            spans.push({ text: space, kind: 'space' });
        } else if (qualifier) {
            const key = qualifier.replace(/^-/, '');
            spans.push({
                text: qualifier,
                kind: qualifierKeys.has(qualifierKey(key)) ? 'qualifier' : 'word',
            });
        } else if (exactQuoted) {
            spans.push({ text: exactQuoted, kind: 'exact' });
        } else if (phrase) {
            spans.push({ text: phrase, kind: 'phrase' });
        } else if (lparen || rparen) {
            spans.push({ text: full, kind: 'paren' });
        } else if (equals) {
            spans.push({ text: equals, kind: 'exact' });
        } else if (minus) {
            spans.push({ text: minus, kind: 'keyword' });
        } else if (word) {
            const previous = spans.at(-1);
            if (KEYWORDS.has(word.toUpperCase()))
                spans.push({ text: word, kind: 'keyword' });
            else if (word.includes('*')) spans.push({ text: word, kind: 'wildcard' });
            else if (previous?.kind === 'exact' && previous.text === '=') {
                spans.push({ text: word, kind: 'exact' });
            } else spans.push({ text: word, kind: 'word' });
        }
        pos += full.length;
    }
    return spans;
}
