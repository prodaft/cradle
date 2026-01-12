/**
 * Authentication and user-related hooks
 * Hooks for managing authentication state
 *
 * Use the split hooks for optimal performance:
 * - useAuthState() - for state values (role, userId, isLoading, basePath)
 * - useAuthActions() - for actions (logIn, logOut, getAccessToken, etc.)
 *
 * Note: useProfile is available from @hooks/user/useProfile
 *
 * @example
 * ```typescript
 * // Split hooks for better performance
 * const { role, basePath } = useAuthState();
 * const { logOut, getAccessToken } = useAuthActions();
 * ```
 */

export { useAuthActions, useAuthState } from './useAuth';
export type { AuthContextValue } from './useAuth';
