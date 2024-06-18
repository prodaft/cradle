// Define what url extension each entry type should have

/**
 * Comprehensive set of all entry types
 * @type {Set<string>}
 */
export const entrySubtypes = new Set([
    'ip',
    'domain',
    'url',
    'username',
    'password',
    'social',
    'hash',
    'tool',
    'cve',
    'ttp',
    'malware',
    'campaign',
    'family',
]);

/**
 * Comprehensive set of all metadata types
 * @type {Set<string>}
 */
export const metadataSubtypes = new Set(['crime', 'industry', 'country', 'company']);

/**
 * Comprehensive set of all entity types
 * @type {Set<string>}
 */
export const entityTypes = new Set(['actor', 'case', 'entry', 'metadata']);

/**
 * Set of all entity types that are not metadata
 * @type {Set<string>}
 */
export const entityTypesReduced = new Set(['actor', 'case', 'entry']);
