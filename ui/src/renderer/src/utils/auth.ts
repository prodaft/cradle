/**
 * Authentication utilities
 * These functions work outside React context (e.g., in router beforeLoad hooks)
 * They match the logic in AuthProvider but read directly from localStorage
 *
 * IMPORTANT: This is the single source of truth for router guards.
 * AuthProvider.isLoggedIn() uses the same logic but reads from refs (for performance).
 * Both check the same localStorage values, ensuring consistency.
 */

/**
 * Check if user is logged in by verifying refresh token exists and is valid
 * This matches the logic in AuthProvider.isLoggedIn() but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthActions().isLoggedIn() instead.
 *
 * @returns true if user has a valid refresh token
 */
export function isLoggedIn(): boolean {
    const refreshToken = localStorage.getItem('refresh_token');
    const refreshExpiresAt = localStorage.getItem('refresh_expires_at');

    if (!refreshToken || !refreshExpiresAt) {
        return false;
    }

    const refreshExpiry = new Date(refreshExpiresAt);
    const now = new Date();

    // Check if refresh token is still valid
    return refreshExpiry > now;
}
