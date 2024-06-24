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

// This can be used to import types with `import * as types from './types';` 
// However, JSDoc automatically resolves types. VSCode does not. 
// Using the import will not generate correct JSDoc, but not using it will not allow VSCode to resolve the types.
export default {}; 
