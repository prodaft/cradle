/**
 * Central export file for all hooks
 *
 * Hooks are organized into functional groups:
 * - api/ - API interaction hooks (useApi)
 * - auth/ - Authentication hooks (useAuthState, useAuthActions)
 * - navigation/ - Navigation hooks
 * - search/ - Search hooks (useFrontendSearch)
 *
 * Note:
 * - Theme hooks (useTheme) are available from @contexts/ui
 * - Profile hooks (useProfile) are available from @hooks/user/useProfile
 *
 * Usage:
 * ```typescript
 * // Import from main index
 * import { useApi, useAuthState, useAuthActions } from '@hooks';
 *
 * // Or import from group
 * import { useApi } from '@hooks/api';
 * import { useAuthState, useAuthActions } from '@hooks/auth';
 * import { useProfile } from '@hooks/user/useProfile';
 *
 * // For optimal performance, use split auth hooks:
 * const { role, basePath } = useAuthState();
 * const { logOut, getAccessToken } = useAuthActions();
 * ```
 */

// API-related hooks
export * from './api';

// Auth-related hooks
export * from './auth';

// Query hooks (TanStack Query)
export * from './query';

// User-related hooks
export * from './user';

// Navigation hooks (currently empty - use TanStack Router directly)

// Search hooks
export * from './search';
