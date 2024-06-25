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

/**
 * Type for objects with style options for each entity type
 *
 * @Typedef {Object} EntityStyleOptions
 * @property {string} actor - The style for actors
 * @property {string} case - The style for cases
 * @property {string} entry - The style for entries
 * @property {string} metadata - The style for metadata
 */

/**
 * entityGraphColors - This object contains the colors for the different entity types in the graph.
 * The colors are used to distinguish between different types of entities in the graph.
 * The keys are the entity types, and the values are the corresponding hex color codes.
 *
 * @type {EntityStyleOptions}
 */
export const entityGraphColors = {
    actor: '#1a85ff',
    case: '#744abf',
    entry: '#e66100',
    metadata: '#d41159',
};

/**
 * entityMarkdownColors - This object contains the colors for the different entity types in the markdown.
 * The colors are used to distinguish between different types of entities in the markdown.
 * The keys are the entity types, and the values are the corresponding tailwindcss classes.
 *
 * @type {EntityStyleOptions}
 */
export const entityMarkdownColors = {
    actors: 'text-[#1a85ff]',
    cases: 'text-[#744abf]',
    entries: 'text-[#e66100]',
    metadata: 'text-[#d41159] underline',
};
