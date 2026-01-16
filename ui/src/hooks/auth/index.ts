/**
 * Authentication and user-related hooks
 * Hooks for managing authentication state
 *
 * Best practice recommendations:
 * - useAuth() - Convenience hook that combines state and actions (use for most components)
 * - useAuthState() - For state values only (role, userId, isLoading, basePath, isAdmin, isEntryManager)
 * - useAuthActions() - For actions only (logIn, logOut, getAccessToken, isLoggedIn, setTokensDirectly)
 *
 * For performance-sensitive components, use the split hooks to avoid unnecessary rerenders.
 *
 * Note: For profile data, use TanStack Query directly with queryKeys.users.detail('me')
 *
 * @example
 * ```typescript
 * // Most components - simple and correct
 * const { role, isAdmin, logOut } = useAuth();
 *
 * // Performance-sensitive - split hooks
 * const { role, isAdmin } = useAuthState();
 * const { logOut, getAccessToken } = useAuthActions();
 * ```
 */

export { useAuth, useAuthActions, useAuthState } from './useAuth';
export type { AuthContextValue } from './useAuth';
