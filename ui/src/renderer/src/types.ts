// Definition of custom types used in the application. Place types that are used in multiple files here.
// Types that are only used in one file are fine to be defined in that file.
//
// NOTE: When possible, use generated types from @/services/cradle/models instead of defining custom types.
// Generated types are automatically synced with the backend API and include type guards and serialization.

import type React from 'react';

// Re-export generated models for domain types
export type {
  FileReference,
  FileReferenceWithNote,
  NoteRetrieve,
  NoteCreateRequest,
  NoteEditRequest,
  Entry,
  Entity,
  UserRetrieve,
} from '@/services/cradle/models';

// ============================================================================
// Custom Application-Specific Types
// ============================================================================
// The types below are specific to the UI and do not have generated equivalents.
// They should remain as custom types.

/**
 * A setter function for a React state variable.
 */
export type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * An object representing an alert. Used in AlertDismissible and AlertBox components.
 */
export interface Alert {
    /** A boolean value indicating whether the alert should be displayed. */
    show: boolean;
    /** The message to be displayed in the alert. */
    message: string;
    /** The color of the alert. Can be 'success', 'error', 'warning', or 'info'. */
    color: 'success' | 'error' | 'warning' | 'info' | string;
}

/**
 * An object representing a notification. Used with the useNotif hook.
 */
export interface Notification {
    /** The type of notification. */
    type: 'success' | 'error' | 'info';
    /** Optional custom background color. */
    background?: string;
    /** Optional icon component. */
    icon?: React.ReactNode;
    /** Optional notification title. */
    title?: string;
    /** The notification message text. */
    text: string;
    /** Duration in milliseconds for which the notification should be displayed. Default is 3500ms. */
    duration?: number;
}

// ============================================================================
// Graph Visualization Types (D3-specific)
// ============================================================================
// These types extend domain types with D3.js-specific properties for visualization.
// The canonical definitions are in @/utils/graph and are re-exported here for convenience.

export type { GraphNode, GraphLink } from '@/utils/graph';

// ============================================================================
// Backward Compatibility Aliases (Deprecated - use generated types)
// ============================================================================
// These are provided for backward compatibility during migration.
// New code should import directly from @/services/cradle/models.

/**
 * @deprecated Use FileReference from @/services/cradle/models instead
 */
export type { FileReference as FileData } from '@/services/cradle/models';

/**
 * @deprecated Use NoteRetrieve from @/services/cradle/models instead
 */
export type { NoteRetrieve as Note } from '@/services/cradle/models';

/**
 * @deprecated Use Entry from @/services/cradle/models instead
 * For graph visualization with D3 properties, use GraphNode instead
 */
export type { Entry as GraphEntry } from '@/services/cradle/models';

/**
 * @deprecated Use Entity from @/services/cradle/models instead
 */
export type { Entity as DashboardEntry } from '@/services/cradle/models';
