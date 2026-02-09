// Definition of custom types used in the application. Place types that are used in multiple files here.
// Types that are only used in one file are fine to be defined in that file.
//
// NOTE: When possible, use generated types from @services/cradle/models instead of defining custom types.
// Generated types are automatically synced with the backend API and include type guards and serialization.

import type React from 'react';
import type { FileReferenceWithNote } from 'src/services/cradle/models';

// Re-export generated models that are actively used from this module
export type { Entry, NoteRetrieve } from 'src/services/cradle/models';

// Type alias for compatibility - FileReference is an alias for FileReferenceWithNote
export type FileReference = FileReferenceWithNote;

/**
 * A setter function for a React state variable.
 */
export type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * An object representing an alert. Used with Alert components.
 */
export interface Alert {
    /** A boolean value indicating whether the alert should be displayed. */
    show: boolean;
    /** The message to be displayed in the alert. */
    message: string;
    /** The color of the alert. Can be 'success', 'error', 'warning', or 'info'. */
    color: 'success' | 'error' | 'warning' | 'info' | string;
}
