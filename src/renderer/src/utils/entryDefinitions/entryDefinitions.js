// Define what url extension each artifact type should have

/**
 * Comprehensive set of all artifact types
 * @type {Set<string>}
 */
export const artifactSubtypes = new Set([
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
 * Comprehensive set of all entry types
 * @type {Set<string>}
 */
export const entryTypes = new Set(['actor', 'case', 'artifact', 'metadata']);

/**
 * Set of all entry types that are not metadata
 * @type {Set<string>}
 */
export const entryTypesReduced = new Set(['actor', 'case', 'artifact']);

/**
 * Type for objects with style options for each entry type
 *
 * @Typedef {Object} EntryStyleOptions
 * @property {string} actor - The style for actors
 * @property {string} case - The style for cases
 * @property {string} artifact - The style for artifacts
 * @property {string} metadata - The style for metadata
 */

/**
 * entryGraphColors - This object contains the colors for the different entry types in the graph.
 * The colors are used to distinguish between different types of entries in the graph.
 * The keys are the entry types, and the values are the corresponding hex color codes.
 *
 * @type {EntryStyleOptions}
 */
export const entryGraphColors = {
    actor: '#1a85ff',
    case: '#744abf',
    artifact: '#e66100',
    metadata: '#d41159',
};

/**
 * entryMarkdownColors - This object contains the colors for the different entry types in the markdown.
 * The colors are used to distinguish between different types of entries in the markdown.
 * The keys are the entry types, and the values are the corresponding tailwindcss classes.
 *
 * @type {EntryStyleOptions}
 */
export const entryMarkdownColors = {
    actors: 'text-[#1a85ff]',
    cases: 'text-[#744abf]',
    artifacts: 'text-[#e66100]',
    metadata: 'text-[#d41159] underline',
};
