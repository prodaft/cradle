// Kibana-style autocomplete for the search bar: as
// the user types, suggest the schema's qualifier keys, `sort:`, and AND/OR/NOT -- and once a
// key's colon is typed, values for that key (enum values, sort fields, relative dates). Purely
// advisory: accepting a suggestion just inserts text into the string search-schema.ts parses.
// Rather than re-implementing that parser's rules here, each candidate is kept only if
// parseSearch accepts the text it would produce (completed with a placeholder where the user
// still has to type something), so suggestions can't drift from what actually parses.

import {
    type QualifierSpec,
    type SearchSchema,
    type SearchState,
    findQualifier,
    parseSearch,
    quoteIfNeeded,
} from '@/lib/search-query/search-schema';
import { format, startOfMonth, subDays } from 'date-fns';

export type SuggestionKind = 'qualifier' | 'keyword' | 'value';

export interface Suggestion {
    label: string;
    kind: SuggestionKind;
    description?: string;
    insertText: string;
}

const KEYWORD_SUGGESTIONS: readonly Suggestion[] = [
    { label: 'AND', insertText: 'AND ', kind: 'keyword', description: 'and' },
    { label: 'OR', insertText: 'OR ', kind: 'keyword', description: 'or' },
    { label: 'NOT', insertText: 'NOT ', kind: 'keyword', description: 'not' },
];

const isoDate = (date: Date) => format(date, 'yyyy-MM-dd');

// `partialValue` may carry a comparison (">", "<=") or "a.." range prefix ahead of the part being
// completed -- e.g. "created:>tod" still suggests "today", inserting ">2026-08-15 ".
function relativeDateSuggestions(partialValue: string): Suggestion[] {
    let prefix = '';
    let remainder = partialValue;
    const rangeAt = remainder.lastIndexOf('..');
    if (rangeAt !== -1) {
        prefix = remainder.slice(0, rangeAt + 2);
        remainder = remainder.slice(rangeAt + 2);
    } else {
        prefix = remainder.match(/^[<>]=?/)?.[0] ?? '';
        remainder = remainder.slice(prefix.length);
    }
    const now = new Date();
    const candidates = [
        { phrase: 'today', date: isoDate(now) },
        { phrase: 'yesterday', date: isoDate(subDays(now, 1)) },
        { phrase: '7 days ago', date: isoDate(subDays(now, 7)) },
        { phrase: '30 days ago', date: isoDate(subDays(now, 30)) },
        { phrase: 'start of this month', date: isoDate(startOfMonth(now)) },
    ];
    return candidates
        .filter((c) => c.phrase.includes(remainder) || c.date.includes(remainder))
        .map((c) => ({
            label: `${c.phrase} (${c.date})`,
            kind: 'value' as const,
            insertText: `${prefix}${c.date} `,
        }));
}

/** Start index of the token containing/ending at `cursor` (tokens split on whitespace). */
function currentTokenStart(input: string, cursor: number): number {
    let start = cursor;
    while (start > 0 && !/\s/.test(input[start - 1]!)) start -= 1;
    return start;
}

// A value suggestion replaces only the part after the colon; a key/keyword suggestion replaces
// the whole token. Shared by getSuggestions and applySuggestion so they never disagree.
function replaceRangeStart(input: string, cursor: number): number {
    const tokenStart = currentTokenStart(input, cursor);
    const colonIndex = input.slice(tokenStart, cursor).indexOf(':');
    return colonIndex === -1 ? tokenStart : tokenStart + colonIndex + 1;
}

function keySuggestions(schema: SearchSchema): Suggestion[] {
    const suggestions: Suggestion[] = (schema.qualifiers ?? []).map((q) => ({
        label: `${q.key}:`,
        insertText: `${q.key}:`,
        kind: 'qualifier',
        description: q.description,
    }));
    if (schema.sortFields?.length) {
        suggestions.push({
            label: 'sort:',
            insertText: 'sort:',
            kind: 'qualifier',
            description: 'sort order',
        });
    }
    return suggestions;
}

function valueSuggestions(
    key: string,
    partialValue: string,
    schema: SearchSchema,
): Suggestion[] {
    if (key === 'sort' && schema.sortFields?.length) {
        const desc = partialValue.startsWith('-');
        const bare = desc ? partialValue.slice(1) : partialValue;
        return schema.sortFields.flatMap((field) =>
            field.value.toLowerCase().includes(bare)
                ? (desc ? [true] : [false, true]).map((d) => ({
                      label: `${d ? '-' : ''}${field.value}`,
                      kind: 'value' as const,
                      description: `${field.label ?? field.value} (${d ? 'descending' : 'ascending'})`,
                      insertText: `${d ? '-' : ''}${field.value} `,
                  }))
                : [],
        );
    }
    const spec = findQualifier(schema, key);
    if (!spec) return [];
    if (spec.kind === 'date') return relativeDateSuggestions(partialValue);
    return (spec.values ?? [])
        .filter(
            (v) =>
                v.value.toLowerCase().includes(partialValue) ||
                v.label?.toLowerCase().includes(partialValue),
        )
        .map((v) => ({
            label: v.value,
            kind: 'value' as const,
            description: v.label ?? spec.description,
            insertText: `${quoteIfNeeded(v.value)} `,
        }));
}

// A value the user could type after an accepted `key:` suggestion, for checking it parses.
function sampleValue(
    spec: QualifierSpec | undefined,
    schema: SearchSchema,
): string | undefined {
    if (!spec) return schema.sortFields?.[0]?.value;
    if (spec.kind === 'date') return '2000-01-01';
    if (spec.kind === 'text') return 'x';
    const first = spec.values[0]?.value;
    return first === undefined ? undefined : quoteIfNeeded(first);
}

// Whether `spec` (undefined = `sort:`) already has a value that another one would conflict with.
function isSet(spec: QualifierSpec | undefined, state: SearchState): boolean {
    if (!spec) return state.sort !== undefined;
    if (spec.kind === 'date') return state.dates[spec.key] !== undefined;
    if (spec.kind === 'enum' && spec.multiple) return false;
    return (state.values[spec.key]?.length ?? 0) > 0;
}

// Closes parentheses left open in `text` (quoted text ignored), so a prefix can be parsed.
function closeParens(text: string): string {
    let depth = 0;
    for (const ch of text.replace(/"(?:[^"\\]|\\.)*"/g, '""')) {
        if (ch === '(') depth += 1;
        if (ch === ')') depth = Math.max(0, depth - 1);
    }
    return text + ')'.repeat(depth);
}

/** Suggestions for the token at `cursor` in `input` -- empty when nothing matches. */
export function getSuggestions(
    input: string,
    cursor: number,
    schema: SearchSchema,
): Suggestion[] {
    // Only complete at the end of a token: mid-token, a replacement would splice into the rest.
    if (cursor < input.length && !/\s/.test(input[cursor]!)) return [];
    const start = currentTokenStart(input, cursor);
    const before = input.slice(0, start);
    // Inside an unclosed quote everything is literal text.
    if (before.replace(/"(?:[^"\\]|\\.)*"/g, '').includes('"')) return [];
    const token = input.slice(start, cursor);
    const colonIndex = token.indexOf(':');

    let candidates: Suggestion[];
    if (colonIndex === -1) {
        const lower = token.toLowerCase();
        // An empty token (just typed a space) would list everything on every keystroke; only
        // open the list once something has been typed.
        if (!lower) return [];
        candidates = [...keySuggestions(schema), ...KEYWORD_SUGGESTIONS].filter(
            (s) =>
                s.label.toLowerCase().startsWith(lower) &&
                s.label.toLowerCase() !== lower,
        );
    } else {
        const key = token.slice(0, colonIndex).toLowerCase();
        const partialValue = token
            .slice(colonIndex + 1)
            .replace(/^"/, '')
            .toLowerCase();
        candidates = valueSuggestions(key, partialValue, schema);
    }

    // Keep a candidate only if the text it produces (plus a placeholder for what's still to be
    // typed) parses. When the rest of the input is already invalid on its own, judge the text up
    // to the cursor instead, so an unrelated mistake further on doesn't hide every suggestion.
    const replaceFrom = replaceRangeStart(input, cursor);
    const after = input.slice(cursor);
    const rest = parseSearch(closeParens(`${before} ${after}`), schema);
    const context = rest.ok ? rest : parseSearch(closeParens(before), schema);
    return candidates.filter((candidate) => {
        let completion = '';
        if (candidate.kind === 'keyword') completion = 'x';
        if (candidate.kind === 'qualifier') {
            const key = candidate.label.slice(0, -1);
            const spec = findQualifier(schema, key);
            // A key that's already set can only be repeated if it's a `multiple` enum (the
            // placeholder value could coincide with the existing one and hide that).
            if (context.ok && isSet(spec, context.state)) return false;
            const sample = sampleValue(spec, schema);
            if (sample === undefined) return false;
            completion = `${sample} `;
        }
        const head = input.slice(0, replaceFrom) + candidate.insertText + completion;
        return parseSearch(closeParens(rest.ok ? `${head} ${after}` : head), schema).ok;
    });
}

/** Splices `suggestion.insertText` in at the cursor; returns the new value + cursor. */
export function applySuggestion(
    input: string,
    cursor: number,
    suggestion: Suggestion,
): { value: string; cursor: number } {
    const start = replaceRangeStart(input, cursor);
    const before = input.slice(0, start);
    const after = input.slice(cursor);
    return {
        value: before + suggestion.insertText + after,
        cursor: before.length + suggestion.insertText.length,
    };
}
