/**
 * Hook for accessing authentication context
 */

import type { AuthContextValue } from '@/components/domain/auth/AuthProvider';
import { AuthContext } from '@/components/domain/auth/AuthProvider';
import { useContext } from 'react';

/**
 * Hook to use the AuthContext
 * Provides access to global context for authentication
 * Must be used inside a component wrapped in AuthProvider
 *
 * @returns Authentication context value
 */
export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export default useAuth;
