/**
 * Central export file for all context providers
 *
 * Contexts are organized into functional groups:
 * - ui/ - UI state management (Theme, Notification)
 *
 * Usage:
 * ```typescript
 * // Import from main index
 * import { ThemeProvider } from '@contexts';
 *
 * // Or import from group
 * import { ThemeProvider } from '@contexts/ui';
 * ```
 *
 * Note: Profile functionality has been moved to @hooks/user/useProfile
 */

// UI-related contexts
export * from './ui';
