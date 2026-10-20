/**
 * Authentication and user-related hooks
 * Hooks for managing authentication state
 *
 * Best practice recommendations:
 * - useAuthState() - For state values only (role, userId, isLoading, basePath, isAdmin, isManager, isInitializing)
 * - useAuthActions() - For actions only (logIn, logOut, isLoggedIn, setTokensDirectly)
 *   Import from '@/hooks/auth/use-auth' for useAuthActions
 *
 * For performance-sensitive components, use the split hooks to avoid unnecessary rerenders.
 *
 * Note: For profile data, use $api.useQuery('get', '/users/{user_id}/') and invalidate with queryKeys.users.apiDetails()
 *
 * @example
 * ```typescript
 * const { role, isAdmin } = useAuthState();
 * const { logOut, isLoggedIn } = useAuthActions(); // from '@/hooks/auth/use-auth'
 * ```
 */

export { useAuthState } from './use-auth';
