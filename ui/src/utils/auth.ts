import type { components } from '@services/openapi/schema';
import { getStorageItem } from '@services/openapi/session-storage';

/**
 * Get user role from localStorage
 * This matches the logic in AuthProvider but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthState().role instead.
 * SSR-safe: returns '' when localStorage is not available (e.g. during server render).
 *
 * @returns user role string or empty string if not logged in
 */
function getRole(): string {
    return getStorageItem('role') || '';
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
function isAdmin(): boolean {
    return getRole() === 'admin';
}

/**
 * Check if user is a manager or admin
 * This matches the logic in AuthProvider but works outside React context
 *
 * Used in router beforeLoad hooks where React context is not available.
 * For components, use useAuthState().isManager instead.
 *
 * @returns true if user is a manager or admin
 */
function isManager(): boolean {
    const role = getRole();
    return role === 'manager' || role === 'admin';
}

const ADMIN_MANAGE_PATHS = ['/manage/users', '/manage/settings'];
// Team leads need not be managers, so team pages and entity settings stay open to everyone;
// the API decides what each user may see there.
const TEAM_MANAGE_PATHS = [/^\/manage\/teams(\/|$)/, /^\/manage\/entities\/[^/]+\/?$/];

/**
 * Whether the current user may open a page under /manage.
 *
 * Used in router beforeLoad hooks: admin pages need admin, team pages and entity settings
 * are open to everyone, and the rest needs manager.
 */
export function canOpenManagePath(path: string): boolean {
    if (ADMIN_MANAGE_PATHS.some((p) => path.startsWith(p))) return isAdmin();
    return isManager() || TEAM_MANAGE_PATHS.some((pattern) => pattern.test(path));
}

type UserRole = components['schemas']['UserRoleEnum'];

const USER_ROLE_LABELS = {
    author: 'Author',
    manager: 'Manager',
    admin: 'Admin',
} satisfies Record<UserRole, string>;

export const USER_ROLE_OPTIONS = (Object.keys(USER_ROLE_LABELS) as UserRole[]).map(
    (value) => ({ value, label: USER_ROLE_LABELS[value] }),
);
