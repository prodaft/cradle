/**
 * Components Index
 *
 * Central export point for all application components organized by domain/functionality.
 */

// Notifications System
export * from './domain/notifications';

// Dialogs
export * from './dialogs';

// Note: Base UI and Feedback components are imported directly via path aliases
// They don't have barrel exports to avoid circular dependencies
