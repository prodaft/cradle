/** Allowed `status` query values for GET `/notes/` (repeat param = OR). */
export const QUERY_SLUGS = [
    'fleeting',
    'finalized',
    'healthy',
    'processing',
    'warning',
    'invalid',
] as const;

export type StatusSlug = (typeof QUERY_SLUGS)[number];

/** Dedupe after values are already validated as status slugs (e.g. post-zod). */
export function dedupeSlugs(slugs: readonly StatusSlug[]): StatusSlug[] {
    return [...new Set(slugs)];
}
