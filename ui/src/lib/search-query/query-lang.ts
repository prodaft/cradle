// Client-side mirror of backend/core/query_lang.py's grammar, over the free-text remainder a
// search bar sends as `search` (qualifiers like status:/created:/sort: are already peeled off by
// search-schema.ts before this sees the string).
//
// Used to gate what a page writes to the URL/API: a syntactically invalid query (most commonly
// an incomplete expression mid-typing, e.g. "widgets AND") never reaches the backend, which
// would just 400 it. The backend stays the authoritative validator; error wording matches it so
// a message looks the same whichever side produced it.

const MIN_WILDCARD_LITERAL_CHARS = 2;
const MAX_QUERY_LENGTH = 512;
const MAX_TOKENS = 128;

type TokenKind =
    'PHRASE' | 'LPAREN' | 'RPAREN' | 'EQUALS' | 'MINUS' | 'AND' | 'OR' | 'NOT' | 'WORD';

interface Token {
    kind: TokenKind;
    text: string;
}

const KEYWORDS = new Set(['AND', 'OR', 'NOT']);

// Sticky ('y') so each match is anchored exactly at `lastIndex` -- a failed match there (e.g. an
// unterminated quote) is unambiguously "can't parse from here".
const TOKEN_RE = /(\s+)|("(?:[^"\\]|\\.)*")|(\()|(\))|(=)|(-(?=\S))|([^\s()"]+)/y;

class QuerySyntaxError extends Error {}

function tokenize(raw: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < raw.length) {
        TOKEN_RE.lastIndex = pos;
        const match = TOKEN_RE.exec(raw);
        if (!match) {
            throw new QuerySyntaxError(
                `Couldn't parse '${raw.slice(pos).trim()}' in query.`,
            );
        }
        const [full, , phrase, lparen, rparen, equals, minus, word] = match;
        if (phrase) tokens.push({ kind: 'PHRASE', text: phrase });
        else if (lparen) tokens.push({ kind: 'LPAREN', text: lparen });
        else if (rparen) tokens.push({ kind: 'RPAREN', text: rparen });
        else if (equals) tokens.push({ kind: 'EQUALS', text: equals });
        else if (minus) tokens.push({ kind: 'MINUS', text: minus });
        else if (word) {
            const upper = word.toUpperCase();
            tokens.push({
                kind: (KEYWORDS.has(upper) ? upper : 'WORD') as TokenKind,
                text: word,
            });
        }
        pos += full.length;
    }
    return tokens;
}

class Parser {
    private tokens: Token[];
    private pos = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    private advance(): Token | undefined {
        return this.tokens[this.pos++];
    }

    parse(): void {
        if (this.tokens.length === 0) {
            throw new QuerySyntaxError('Query is empty.');
        }
        if (this.tokens.length > MAX_TOKENS) {
            throw new QuerySyntaxError(`Query has too many terms (max ${MAX_TOKENS}).`);
        }
        this.orExpr();
        const remaining = this.peek();
        if (remaining) {
            throw new QuerySyntaxError(`Unexpected '${remaining.text}' in query.`);
        }
    }

    private orExpr(): void {
        this.andExpr();
        while (this.peek()?.kind === 'OR') {
            this.advance();
            this.andExpr();
        }
    }

    private andExpr(): void {
        this.notExpr();
        for (;;) {
            const token = this.peek();
            if (!token || token.kind === 'OR' || token.kind === 'RPAREN') return;
            if (token.kind === 'AND') this.advance();
            this.notExpr();
        }
    }

    private notExpr(): void {
        const token = this.peek();
        if (token && (token.kind === 'NOT' || token.kind === 'MINUS')) {
            this.advance();
            this.simpleAtom();
            return;
        }
        this.atom();
    }

    private atom(): void {
        if (this.peek()?.kind === 'LPAREN') {
            this.advance();
            this.orExpr();
            if (this.peek()?.kind !== 'RPAREN') {
                throw new QuerySyntaxError("Missing closing ')' in query.");
            }
            this.advance();
            return;
        }
        this.simpleAtom();
    }

    private simpleAtom(): void {
        const token = this.peek();
        if (!token) {
            throw new QuerySyntaxError(
                'Query ended where a term or phrase was expected.',
            );
        }
        if (token.kind === 'LPAREN') {
            throw new QuerySyntaxError(
                "NOT/'-' can only negate a single term or phrase, not a group in parentheses.",
            );
        }
        if (token.kind === 'EQUALS') {
            this.advance();
            this.exactOperand();
            return;
        }
        if (token.kind === 'PHRASE') {
            this.advance();
            if (token.text === '""') {
                throw new QuerySyntaxError("Quoted phrase can't be empty.");
            }
            return;
        }
        if (token.kind === 'WORD') {
            this.advance();
            if (token.text.includes('*')) {
                const literalChars = token.text.replace(/\*/g, '');
                if ([...literalChars].length < MIN_WILDCARD_LITERAL_CHARS) {
                    throw new QuerySyntaxError(
                        `Wildcard term '${token.text}' needs at least ${MIN_WILDCARD_LITERAL_CHARS} non-'*' characters.`,
                    );
                }
            }
            return;
        }
        throw new QuerySyntaxError(`Unexpected '${token.text}' in query.`);
    }

    private exactOperand(): void {
        const token = this.peek();
        if (!token) {
            throw new QuerySyntaxError(
                "Query ended where an exact term or phrase was expected after '='.",
            );
        }
        if (token.kind === 'PHRASE') {
            this.advance();
            if (token.text === '""') {
                throw new QuerySyntaxError(
                    "Exact match can't be an empty quoted phrase.",
                );
            }
            return;
        }
        if (token.kind === 'WORD') {
            if (token.text.includes('*')) {
                throw new QuerySyntaxError(
                    "Exact match ('=') can't be combined with wildcards ('*'). " +
                        'Use =admin or ="admin ci" for a whole-field match, or admin* / *admin* for a pattern.',
                );
            }
            this.advance();
            return;
        }
        throw new QuerySyntaxError(
            `Expected a term or phrase after '=', got '${token.text}'.`,
        );
    }
}

/**
 * Validates *raw* (the free-text remainder, after qualifier extraction) against
 * backend/core/query_lang.py's grammar. Returns an error message, or `null` when valid. Blank
 * text is always valid -- there's simply no text search.
 */
export function validateQuery(raw: string): string | null {
    if (!raw.trim()) return null;
    // Code points, like the backend's len(), not UTF-16 units.
    if ([...raw].length > MAX_QUERY_LENGTH) {
        return `Query is too long (max ${MAX_QUERY_LENGTH} characters).`;
    }
    try {
        new Parser(tokenize(raw)).parse();
        return null;
    } catch (error) {
        if (error instanceof QuerySyntaxError) return error.message;
        throw error;
    }
}
