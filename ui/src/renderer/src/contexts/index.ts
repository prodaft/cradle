/**
 * Central export file for all context providers
 *
 * Contexts are organized into functional groups:
 * - ui/ - UI state management (Theme, Modal, Notification, Layout)
 * - tabs/ - Tab and pane management (PaneTabs, TabHost)
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
 * import { PaneTabsProvider, TabHostProvider } from '@contexts/tabs';
 * import { ProfileProvider, useProfile } from '@contexts/user';
 * import { RouteConfigProvider, useRouteConfigs } from '@contexts/routing';
 * ```
 */

// UI-related contexts
export * from './ui';

// Tab-related contexts
export * from './tabs';

// User-related contexts
export * from './user';

// Routing contexts
export * from './routing';
