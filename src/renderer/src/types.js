// Definition of custom types used in the application. Place types that are used in mutliple files here.
// Types that are only used in one file are fine to be defined in that file.

/**
 * A setter function for a React state variable.
 * @template T - The type of the state variable.
 * @typedef {React.Dispatch<React.SetStateAction<T>>} StateSetter
 */

/**
 * An object representing an alert. Used in AlertDismissible and AlertBox components.
 * @typedef {Object} Alert
 * @property {boolean} show - A boolean value indicating whether the alert should be displayed.
 * @property {string} message - The message to be displayed in the alert.
 * @property {string} color - The color of the alert. Can be 'green', 'red', or 'gray'.
 */

/**
 * @typedef {Object} FileData
 * @property {string} minio_file_name - the name of the file in MinIO
 * @property {string} file_name - the name of the file
 * @property {string} bucket_name - the name of the bucket
 */

/**
 * An object representing a note. Used in DashboardNote component.
 * @typedef {Object} Note
 * @property {string} id - The id of the note.
 * @property {string} content - The content of the note.
 * @property {Array<FileData>} files - The files associated with the note.
 * @property {boolean} publishable - Whether the note is publishable.
 */

/**
 * The entries in the dashboard. They are used to create links to their dashboards, which are created using name and (sub)type.
 * @typedef {Object} DashboardEntry
 * @property {string} name - the name of the entry
 * @property {string} type - the type of the entry, e.g. 'actor', 'entity', 'artifact', 'metadata'
 * @property {string} [subtype] - the subtype for entries with 'artifact' or 'metadata' type
 */

/**
 * The entries in the Knowledge Graph. Similar to {@link DashboardEntry} but these must have id's.
 * @typedef {Object} GraphEntry
 * @property {string} id - the unique identifier of the entry
 * @property {string} name - the name of the entry
 * @property {string} type - the type of the entry
 * @property {string} [subtype] - the subtype of the entry
 */

/**
 * The links (edges) between the nodes of the Knowledge Graph
 * @typedef {Object} GraphLink
 * @property {string} source - the id of the source node
 * @property {string} target - the id of the target node
 */

/**
 * The nodes (vertices) of the Knowledge Graph. These contain links to {@link GraphEntry}.
 * @typedef {Object} GraphNode
 * @property {string} id - the unique identifier of the node
 * @property {string} label - the label of the node
 * @property {string} color - the color of the node
 * @property {string} name - the name of the node
 * @property {string} type - the type of the node
 * @property {string} [subtype] - the subtype of the node
 * @property {number} degree - the degree of the node (number of links connected to the node)
 * @property {number} x - the x-coordinate of the node
 * @property {number} y - the y-coordinate of the node
 * @property {number} vx - the x-velocity of the node
 * @property {number} vy - the y-velocity of the node
 * @property {number|null} fx - the x-coordinate of the node when fixed
 * @property {number|null} fy - the y-coordinate of the node when fixed
 */

// This can be used to import types with `import * as types from './types';`
// However, JSDoc automatically resolves types. VSCode does not.
// Using the import will not generate correct JSDoc, but not using it will not allow VSCode to resolve the types.
export default {};
