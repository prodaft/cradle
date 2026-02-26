/**
 * Hook for accessing authentication context
 */

import {
    AuthActionsContext,
    AuthStateContext,
    type AuthActionsValue,
    type AuthContextValue,
    type AuthStateValue,
} from '@/components/domain/auth/auth-context';
import { useContext, type Context } from 'react';

const useRequiredContext = <T>(ctx: Context<T | undefined>, hookName: string): T => {
    const value = useContext(ctx);

    if (value == null) {
        throw new Error(`${hookName} must be used within an AuthProvider`);
    }

    return value;
};

/**
 * Hook to access authentication state only (role, userId, isLoading, basePath, isAdmin, isEntryManager)
 * Use this when you only need state values to avoid rerenders from action changes
 *
 * @returns Authentication state value
 */
export const useAuthState = (): AuthStateValue => {
    return useRequiredContext(AuthStateContext, 'useAuthState');
};

/**
 * Hook to access authentication actions only (logIn, logOut, getAccessToken, isLoggedIn, setTokensDirectly)
 * Use this when you only need actions to avoid rerenders from state changes
 *
 * @returns Authentication actions value
 */
export const useAuthActions = (): AuthActionsValue => {
    return useRequiredContext(AuthActionsContext, 'useAuthActions');
};

/**
 * Convenience hook that combines state and actions
 * Use this for most components (simple + correct)
 * For performance-sensitive components, use useAuthState() or useAuthActions() separately
 *
 * @returns Combined authentication state and actions
 */
export const useAuth = (): AuthContextValue => {
    return {
        ...useAuthState(),
        ...useAuthActions(),
    };
};

export type { AuthContextValue } from '@/components/domain/auth/auth-context';
