/**
 * Single-select status filter helpers shared by list pages whose `status` URL param
 * holds one slug (digests, enrichment requests, reports).
 */
export function createStatusFilter<const T extends readonly string[]>(slugs: T) {
    type Slug = T[number];
    const slugSet = new Set<string>(slugs);

    return {
        parseParam(raw: unknown): Slug | undefined {
            if (typeof raw !== 'string') return undefined;
            const trimmed = raw.trim();
            return slugSet.has(trimmed) ? (trimmed as Slug) : undefined;
        },
    };
}
