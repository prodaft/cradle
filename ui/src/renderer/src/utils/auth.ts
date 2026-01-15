/**
 * Authentication utilities
 * These functions work outside React context (e.g., in router beforeLoad hooks)
 * They match the logic in AuthProvider but read directly from localStorage
 *
 * IMPORTANT: This is the single source of truth for router guards.
 * AuthProvider methods use the same logic but read from refs/state (for performance).
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

/**
 * Get user role from localStorage
 * This matches the logic in AuthProvider but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthState().role instead.
 *
 * @returns user role string or empty string if not logged in
 */
export function getRole(): string {
    return localStorage.getItem('role') || '';
}

/**
 * Check if user is an admin
 * This matches the logic in AuthProvider but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthState().isAdmin instead.
 *
 * @returns true if user is an admin
 */
export function isAdmin(): boolean {
    return getRole() === 'admin';
}

/**
 * Check if user is an entry manager or admin
 * This matches the logic in AuthProvider but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthState().isEntryManager instead.
 *
 * @returns true if user is an entry manager or admin
 */
export function isEntryManager(): boolean {
    const role = getRole();
    return role === 'entrymanager' || role === 'admin';
}
