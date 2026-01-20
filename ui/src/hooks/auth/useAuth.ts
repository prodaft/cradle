/**
 * Hook for accessing authentication context
 */

import type {
    AuthActionsValue,
    AuthContextValue,
    AuthStateValue,
} from '@/components/domain/auth/AuthProvider';
import {
    AuthActionsContext,
    AuthStateContext,
} from '@/components/domain/auth/AuthProvider';
import { useContext } from 'react';

/**
 * Hook to access authentication state only (role, userId, isLoading, basePath, isAdmin, isEntryManager)
 * Use this when you only need state values to avoid rerenders from action changes
 *
 * @returns Authentication state value
 */
export const useAuthState = (): AuthStateValue => {
    const context = useContext(AuthStateContext);

    if (!context) {
        throw new Error('useAuthState must be used within an AuthProvider');
    }

    return context;
};

/**
 * Hook to access authentication actions only (logIn, logOut, getAccessToken, isLoggedIn, setTokensDirectly)
 * Use this when you only need actions to avoid rerenders from state changes
 *
 * @returns Authentication actions value
 */
export const useAuthActions = (): AuthActionsValue => {
    const context = useContext(AuthActionsContext);

    if (!context) {
        throw new Error('useAuthActions must be used within an AuthProvider');
    }

    return context;
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

export type { AuthContextValue } from '@/components/domain/auth/AuthProvider';
