// Define what url extension each artifact type should have

/**
 * Comprehensive set of all entry types
 * @type {Set<string>}
 */
export const entryTypes = new Set(['entity', 'metadata']);

/**
 * Type for objects with style options for each entry type
 *
 * @Typedef {Object} EntryStyleOptions
 * @property {string} actor - The style for actors
 * @property {string} entity - The style for entities
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
    entity: '#744abf',
    artifact: '#e66100',
};

/**
 * entryMarkdownColors - This object contains the colors for the different entry types in the markdown.
 * The colors are used to distinguish between different types of entries in the markdown.
 * The keys are the entry types, and the values are the corresponding tailwindcss classes.
 *
 * @type {EntryStyleOptions}
 */
export const entryMarkdownColors = {
    entities: 'text-[#744abf]',
    artifacts: 'text-[#e66100]',
};
