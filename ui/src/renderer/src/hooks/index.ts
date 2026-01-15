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
 * - Profile data: use TanStack Query directly with queryKeys.users.detail('me')
 *
 * Usage:
 * ```typescript
 * // Import from main index
 * import { useApi, useAuthState, useAuthActions } from '@hooks';
 *
 * // Or import from group
 * import { useApi } from '@hooks/api';
 * import { useAuthState, useAuthActions } from '@hooks/auth';
 * // For profile data, use TanStack Query directly:
 * import { useQuery } from '@tanstack/react-query';
 * import { queryKeys } from '@hooks/query';
 * const { data: profile } = useQuery({
 *   queryKey: queryKeys.users.detail('me'),
 *   queryFn: () => usersApi.usersRetrieve({ userId: 'me' }),
 * });
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

// Navigation hooks (currently empty - use TanStack Router directly)

// Search hooks
export * from './search';
