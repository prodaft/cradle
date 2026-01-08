/**
 * Central export file for all context providers
 *
 * Contexts are organized into functional groups:
 * - ui/ - UI state management (Theme, Modal, Notification)
 * - user/ - User profile management (Profile)
 * - routing/ - Routing configuration (RouteConfig)
 *
 * Usage:
 * ```typescript
 * // Import from main index
 * import { ThemeProvider, ModalProvider, ProfileProvider } from '@contexts';
 *
 * // Or import from group
 * import { ThemeProvider, ModalProvider } from '@contexts/ui';
 * import { ProfileProvider, useProfile } from '@contexts/user';
 * import { RouteConfigProvider, useRouteConfigs } from '@contexts/routing';
 * ```
 */

// UI-related contexts
export * from './ui';

// User-related contexts
export * from './user';

// Routing contexts
export * from './routing';
