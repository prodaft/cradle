// The qualifier layer of the search bar (driven by a per-page SearchSchema): one text input,
// `key:value` tokens peeled off into structured filters/sort, everything else left as free
// text and sent to the backend as `search`, where backend/core/query_lang.py parses the
// AND/OR/NOT/wildcard/phrase syntax.

import { toDay } from '@/lib/search-query/dates';
import { validateQuery } from '@/lib/search-query/query-lang';

interface QualifierValue {
    value: string;
    label?: string;
}

interface QualifierBase {
    key: string;
    description: string;
    /** Extra spellings accepted for `key` (e.g. `username` for `user`). */
    aliases?: readonly string[];
}

/** `key:value` restricted to a fixed vocabulary. */
interface EnumQualifier extends QualifierBase {
    kind: 'enum';
    values: readonly QualifierValue[];
    /** Whether `key:a key:b` means "any of"; otherwise a second, different value is an error. */
    multiple?: boolean;
}

/** `key:value` with free-form value; `values` are only offered as suggestions. */
interface TextQualifier extends QualifierBase {
    kind: 'text';
    values?: readonly QualifierValue[];
    example?: string;
}

/** `key:2024-01-01`, `key:>2024-01-01`, `key:<2024-01-01`, `key:2024-01-01..2024-02-01`. */
interface DateQualifier extends QualifierBase {
    kind: 'date';
}

export type QualifierSpec = EnumQualifier | TextQualifier | DateQualifier;

interface SortField {
    value: string;
    label?: string;
    /** The API's ordering field, when it differs from `value` (e.g. `created` -> `created_at`). */
    api?: string;
}

export interface SearchSchema {
    qualifiers?: readonly QualifierSpec[];
    /** Fields `sort:` accepts; `sort:-field` is descending. Omit to disable `sort:`. */
    sortFields?: readonly SortField[];
}

export interface DateRange {
    after?: string;
    before?: string;
}

export interface SortValue {
    field: string;
    desc: boolean;
}

export interface SearchState {
    /** Free-text remainder, sent to the backend's `search` param. */
    q?: string;
    /** enum/text qualifier values, keyed by canonical qualifier key. */
    values: Record<string, string[]>;
    /** date qualifier ranges, keyed by canonical qualifier key. */
    dates: Record<string, DateRange>;
    sort?: SortValue;
}

type ParseResult = { ok: true; state: SearchState } | { ok: false; error: string };

export const EMPTY_SEARCH_STATE: SearchState = { values: {}, dates: {} };

/** For search boxes with no qualifiers or sort: just the free-text syntax. */
export const FREE_TEXT_SCHEMA: SearchSchema = {};

// In order: `key:"quoted value"` and `key:bare-value` (either optionally led by `-`); a quoted
// phrase, optionally led by `=` (exact) and/or `-` (excluded), kept whole so its inner spacing and
// any `key:`-looking text inside survive; a parenthesis; any other run of characters (terms,
// AND/OR/NOT, wildcards); and a stray `"`, left for validateQuery to reject. Keys may contain
// dots/underscores; a bare value stops at whitespace, quotes and parentheses.
const TOKEN_RE =
    /-?[a-zA-Z_][a-zA-Z0-9_.]*:"(?:[^"\\]|\\.)*"|-?[a-zA-Z_][a-zA-Z0-9_.]*:[^\s()"]*|-?=?"(?:[^"\\]|\\.)*"|[()]|[^\s()"]+|"/g;
const QUALIFIER_RE = /^(-)?([a-zA-Z_][a-zA-Z0-9_.]*):(.*)$/;
const NOT_RE = /^NOT$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function findQualifier(
    schema: SearchSchema,
    key: string,
): QualifierSpec | undefined {
    const lower = key.toLowerCase();
    return schema.qualifiers?.find(
        (q) => q.key === lower || q.aliases?.includes(lower),
    );
}

/** Every key (and alias) the schema recognizes, `sort` included -- for highlighting. */
export function recognizedKeys(schema: SearchSchema): Set<string> {
    const keys = new Set<string>();
    for (const q of schema.qualifiers ?? []) {
        keys.add(q.key);
        for (const alias of q.aliases ?? []) keys.add(alias);
    }
    if (schema.sortFields?.length) keys.add('sort');
    return keys;
}

function unquote(value: string): string {
    return value.length >= 2 && value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1).replace(/\\(.)/g, '$1')
        : value;
}

export function quoteIfNeeded(value: string): string {
    return /[\s"()]/.test(value) || value === ''
        ? `"${value.replace(/["\\]/g, '\\$&')}"`
        : value;
}

// GitHub search's date syntax: ">2024-01-01" / "<2024-01-01" (open-ended, >=/<= accepted as
// synonyms -- bounds are inclusive either way), "2024-01-01" (that day), or
// "2024-01-01..2024-02-01" (either side may be blank for an open end).
function parseDateRange(value: string): DateRange | string {
    let range: DateRange;
    const prefix = value.match(/^[<>]=?/)?.[0];
    if (prefix) {
        const date = value.slice(prefix.length);
        range = prefix.startsWith('>') ? { after: date } : { before: date };
    } else if (value.includes('..')) {
        const at = value.indexOf('..');
        range = {
            after: value.slice(0, at) || undefined,
            before: value.slice(at + 2) || undefined,
        };
    } else {
        range = { after: value, before: value };
    }
    for (const date of [range.after, range.before]) {
        if (date !== undefined && (!DATE_RE.test(date) || toDay(date) !== date)) {
            return `Invalid date '${date}'. Use YYYY-MM-DD.`;
        }
    }
    if (range.after === undefined && range.before === undefined) {
        return 'Date filter needs at least one date.';
    }
    if (range.after && range.before && range.after > range.before) {
        return `Date range starts after it ends ('${value}').`;
    }
    return range;
}

function formatDateRange({ after, before }: DateRange): string | undefined {
    if (after && before) return after === before ? after : `${after}..${before}`;
    if (after) return `>${after}`;
    if (before) return `<${before}`;
    return undefined;
}

function resolveSort(value: string, schema: SearchSchema): SortValue | string {
    const desc = value.startsWith('-');
    const bare = (desc ? value.slice(1) : value).toLowerCase();
    const field = schema.sortFields?.find((f) => f.value.toLowerCase() === bare);
    if (!field) {
        const allowed = schema.sortFields?.map((f) => f.value).join(', ');
        return `Can't sort by '${bare}'. Use one of: ${allowed}.`;
    }
    return { field: field.value, desc };
}

type Item =
    | { kind: 'free'; text: string; start: number; end: number; depth: number }
    | { kind: 'qualifier'; label: string };

/**
 * Parses one search-bar string into structured filters + a free-text remainder, validating the
 * remainder against the backend grammar. Unknown `key:value` tokens stay in the free text as
 * literal content (so e.g. a URL search still works). Qualifiers are filters, not terms: they
 * can't be negated, grouped in parentheses or OR-ed, and an AND next to one is dropped. Each
 * qualifier may appear once (enum qualifiers marked `multiple` may repeat, meaning "any of").
 */
export function parseSearch(input: string, schema: SearchSchema): ParseResult {
    const state: SearchState = { values: {}, dates: {} };
    const items: Item[] = [];
    let depth = 0;
    const matches = [...input.matchAll(TOKEN_RE)];
    // A stray quote would otherwise surface as a confusing error about whatever follows it.
    if (matches.some((match) => match[0] === '"')) {
        return { ok: false, error: "Missing closing '\"' in query." };
    }
    for (const match of matches) {
        const token = match[0];
        const start = match.index;
        const parts = token.match(QUALIFIER_RE);
        const key = parts?.[2];
        const isSort = key?.toLowerCase() === 'sort' && !!schema.sortFields?.length;
        const spec = key ? findQualifier(schema, key) : undefined;
        if (!parts || (!spec && !isSort)) {
            if (token === ')') depth = Math.max(0, depth - 1);
            items.push({
                kind: 'free',
                text: token,
                start,
                end: start + token.length,
                depth,
            });
            if (token === '(') depth += 1;
            continue;
        }
        const label = isSort ? 'sort' : spec!.key;
        const previous = items.at(-1);
        if (parts[1] || (previous?.kind === 'free' && NOT_RE.test(previous.text))) {
            return {
                ok: false,
                error: `'${label}:' can't be negated with '-' or NOT.`,
            };
        }
        if (depth > 0) {
            return {
                ok: false,
                error: `'${label}:' can't be used inside parentheses.`,
            };
        }
        const value = unquote(parts[3] ?? '');
        if (!value) {
            return { ok: false, error: `Expected a value after '${label}:'.` };
        }

        const repeated = isSort
            ? state.sort !== undefined
            : spec!.kind === 'date' && state.dates[spec!.key] !== undefined;
        if (repeated) {
            const hint = isSort ? '' : ` Use ${label}:<from>..<to> for a range.`;
            return { ok: false, error: `Only one '${label}:' is allowed.${hint}` };
        }

        if (isSort) {
            const sort = resolveSort(value, schema);
            if (typeof sort === 'string') return { ok: false, error: sort };
            state.sort = sort;
        } else if (spec!.kind === 'date') {
            const range = parseDateRange(value);
            if (typeof range === 'string') return { ok: false, error: range };
            state.dates[spec!.key] = range;
        } else {
            const known =
                spec!.kind === 'enum'
                    ? spec!.values.find(
                          (v) => v.value.toLowerCase() === value.toLowerCase(),
                      )?.value
                    : value;
            if (known === undefined) {
                const allowed = (spec as EnumQualifier).values.map((v) => v.value);
                return {
                    ok: false,
                    error: `Unknown ${label} '${value}'. Use one of: ${allowed.join(', ')}.`,
                };
            }
            const existing = state.values[spec!.key] ?? [];
            const multiple = spec!.kind === 'enum' && spec!.multiple;
            if (!multiple && existing.length > 0 && existing[0] !== known) {
                return { ok: false, error: `Only one '${label}:' value is allowed.` };
            }
            state.values[spec!.key] = existing.includes(known)
                ? existing
                : [...existing, known];
        }
        items.push({ kind: 'qualifier', label });
    }

    // Rebuild the free text from what's left, keeping the original adjacency (so `(a OR b)` and
    // `"a  b"` come back exactly as typed) and dropping only the ANDs that joined a qualifier.
    // Qualifiers are AND-ed with the whole remainder, so a top-level OR would silently change
    // meaning (`a OR b AND status:x`); it has to be grouped in parentheses.
    const hasQualifier = items.some((item) => item.kind === 'qualifier');
    let q = '';
    let lastEnd: number | undefined;
    for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if (item.kind !== 'free') continue;
        const neighbor = [items[i - 1], items[i + 1]].find(
            (n) => n?.kind === 'qualifier',
        );
        if (neighbor?.kind === 'qualifier' && /^(AND|OR)$/i.test(item.text)) {
            if (/^OR$/i.test(item.text)) {
                return {
                    ok: false,
                    error: `'${neighbor.label}:' can only be combined with AND, not OR.`,
                };
            }
            continue;
        }
        if (hasQualifier && item.depth === 0 && /^OR$/i.test(item.text)) {
            return {
                ok: false,
                error: 'Group OR terms in parentheses when using filters, e.g. (a OR b) status:x.',
            };
        }
        q += (lastEnd !== undefined && lastEnd !== item.start ? ' ' : '') + item.text;
        lastEnd = item.end;
    }
    const error = validateQuery(q);
    if (error) return { ok: false, error };
    if (q) state.q = q;
    return { ok: true, state };
}

/** API ordering value (`field` / `-field`) for a sort, or undefined for none/unknown. */
export function sortToOrderBy(
    sort: SortValue | undefined,
    schema: SearchSchema,
): string | undefined {
    const field = sort && schema.sortFields?.find((f) => f.value === sort.field);
    if (!field) return undefined;
    const api = field.api ?? field.value;
    return sort.desc ? `-${api}` : api;
}

/** The inverse of {@link sortToOrderBy}, from an API field + direction (e.g. URL params). */
function sortFromApi(
    apiField: unknown,
    desc: boolean,
    schema: SearchSchema,
): SortValue | undefined {
    const field = schema.sortFields?.find((f) => (f.api ?? f.value) === apiField);
    return field ? { field: field.value, desc } : undefined;
}

/** Sort as the `<page>_sort_field` (API field) / `<page>_sort_direction` URL params. */
export function sortToUrl(
    sort: SortValue | undefined,
    schema: SearchSchema,
): { field?: string; direction?: 'asc' | 'desc' } {
    const orderBy = sortToOrderBy(sort, schema);
    if (!orderBy) return { field: undefined, direction: undefined };
    return { field: orderBy.replace(/^-/, ''), direction: sort!.desc ? 'desc' : 'asc' };
}

/** The inverse of {@link sortToUrl}; a missing direction means descending. */
export function sortFromUrl(
    field: unknown,
    direction: unknown,
    schema: SearchSchema,
): SortValue | undefined {
    return sortFromApi(field, direction !== 'asc', schema);
}

/**
 * The inverse of {@link parseSearch}: renders filter state back into search-bar text, so the box
 * shows e.g. `status:active created:>2024-01-01 widgets` after loading a bookmarked URL.
 */
export function formatSearch(state: SearchState, schema: SearchSchema): string {
    const parts: string[] = [];
    for (const spec of schema.qualifiers ?? []) {
        if (spec.kind === 'date') {
            const range = state.dates[spec.key];
            const value = range && formatDateRange(range);
            if (value) parts.push(`${spec.key}:${value}`);
        } else {
            for (const value of state.values[spec.key] ?? []) {
                parts.push(`${spec.key}:${quoteIfNeeded(value)}`);
            }
        }
    }
    if (state.sort && schema.sortFields?.length) {
        parts.push(`sort:${state.sort.desc ? '-' : ''}${state.sort.field}`);
    }
    if (state.q) parts.push(state.q);
    return parts.join(' ');
}
