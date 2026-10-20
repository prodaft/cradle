import { noteListStatusEnumValues } from '@services/openapi/schema';

export type StatusSlug = (typeof noteListStatusEnumValues)[number];

/** Dedupe after values are already validated as status slugs (e.g. post-zod). */
export function dedupeSlugs(slugs: readonly StatusSlug[]): StatusSlug[] {
    return [...new Set(slugs)];
}
