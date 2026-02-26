/**
 * Central export file for all hooks
 *
 * Hooks are organized into functional groups:
 * - auth/ - Authentication hooks (useAuthState, useAuthActions)
 * - navigation/ - Navigation hooks
 * - query/ - Query keys for TanStack Query
 *
 * Note:
 * - Theme hooks (useTheme) are available from @contexts/ui
 * - For API calls, import { $api, fetchClient } from '@services/openapi/client'
 *
 * Usage:
 * ```typescript
 * import { useAuthState, useAuthActions } from '@hooks';
 * import { $api } from '@services/openapi/client';
 *
 * const { data: profile } = $api.useQuery(
 *   'get', '/users/{user_id}/', { params: { path: { user_id: 'me' } } },
 * );
 *
 * const { role, basePath } = useAuthState();
 * const { logOut, getAccessToken } = useAuthActions();
 * ```
 */

// Auth-related hooks
export * from './auth';

// Query hooks (TanStack Query)
export * from './query';
