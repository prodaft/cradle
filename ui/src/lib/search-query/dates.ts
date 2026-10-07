// Conversions between date-qualifier days (`YYYY-MM-DD`, inclusive, in the viewer's local time)
// and the ISO datetimes the list endpoints' `*_gte`/`*_lte` style params expect.

import type { DateRange } from '@/lib/search-query/search-schema';
import { endOfDay, format, isValid, parseISO, startOfDay } from 'date-fns';

/** Local `YYYY-MM-DD` from a day or an ISO datetime (e.g. a URL param); undefined if invalid. */
export function toDay(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    const date = parseISO(value);
    return isValid(date) ? format(date, 'yyyy-MM-dd') : undefined;
}

/** Inclusive lower bound: start of the local day, as an ISO datetime. */
export function dayStartIso(day: unknown): string | undefined {
    const key = toDay(day);
    return key ? startOfDay(parseISO(key)).toISOString() : undefined;
}

/** Inclusive upper bound: end of the local day, as an ISO datetime. */
export function dayEndIso(day: unknown): string | undefined {
    const key = toDay(day);
    return key ? endOfDay(parseISO(key)).toISOString() : undefined;
}

/**
 * A date-qualifier range from two URL params (days or legacy ISO datetimes). A reversed range is
 * dropped, since the search box couldn't show it as text that parses.
 */
export function dateRangeFromUrl(from: unknown, to: unknown): DateRange | undefined {
    const after = toDay(from);
    const before = toDay(to);
    if (!after && !before) return undefined;
    if (after && before && after > before) return undefined;
    return { after, before };
}
