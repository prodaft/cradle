/**
 * Components Index
 *
 * Central export point for all application components organized by domain/functionality.
 */

// Authentication & Authorization
export * from './domain/auth';

// Admin Panel & Management
export * from './domain/admin';

// Note Management
export * from './domain/notes';

// File Management
export * from './domain/files';

// Knowledge Graph & Visualization
export * from './domain/graph';

// Relations & References
export * from './domain/relations';

// Dashboard Views
export * from './domain/dashboard';

// Reports & Publishing
export * from './domain/reports';

// Data Enrichment
export * from './domain/enrichment';

// Notifications System
export * from './domain/notifications';

// Activity & Actions Tracking
export * from './domain/activity';

// Search Functionality
export * from './domain/search';

// Modal Dialogs
export * from './modals';

// Layout Components
export * from './layout';

// Form Components
export * from './forms';

// User Account Management
export * from './domain/user';

// Note: Base UI and Feedback components are imported directly via path aliases
// They don't have barrel exports to avoid circular dependencies
