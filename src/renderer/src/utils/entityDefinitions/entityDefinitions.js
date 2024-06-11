// Define what url extension each entry type should have

/**
 * Comprehensive set of all entry types
 * @type {Set<string>}
 */
export const entryTypes = new Set([
    'ip',
    'domain',
    'url',
    'username',
    'password',
    'person',
    'social-media',
    'hash',
    'tool',
    'cve',
    'ttp',
]);

/**
 * Comprehensive set of all metadata types
 * @type {Set<string>}
 */
export const metadataTypes = new Set(['crime', 'industry', 'country', 'company']);

/**
 * Comprehensive set of all entity types
 * @type {Set<string>}
 */
export const entityCategories = new Set(['actor', 'case', 'entry', 'metadata']);

/**
 * Set of all entity types that are not metadata
 * @type {Set<string>}
 */
export const entityCategoriesReduced = new Set(['actor', 'case', 'entry']);
