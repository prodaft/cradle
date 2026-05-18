/**
 * Authentication and user-related hooks
 * Hooks for managing authentication state
 *
 * Best practice recommendations:
 * - useAuthState() - For state values only (role, userId, isLoading, basePath, isAdmin, isEntryManager, isInitializing)
 * - useAuthActions() - For actions only (logIn, logOut, getAccessToken, isLoggedIn, setTokensDirectly)
 *   Import from '@/hooks/auth/use-auth' for useAuthActions
 *
 * For performance-sensitive components, use the split hooks to avoid unnecessary rerenders.
 *
 * Note: For profile data, use TanStack Query directly with queryKeys.users.detail('me')
 *
 * @example
 * ```typescript
 * const { role, isAdmin } = useAuthState();
 * const { logOut, getAccessToken } = useAuthActions(); // from '@/hooks/auth/use-auth'
 * ```
 */

export { useAuthState } from './use-auth';
