/**
 * Auth context - separate from AuthProvider for HMR stability.
 * When AuthProvider is hot-reloaded, the context reference must stay stable
 * or components like MainLayout will lose the provider and throw.
 */

import { createContext } from 'react';

export interface TokenData {
    access: string;
    refresh: string;
    accessExpiresAt: Date;
    refreshExpiresAt: Date;
    role: string;
    user_id?: string;
}

export interface LoginResult {
    result: string;
    message?: string;
    title?: string;
}

export interface AuthStateValue {
    role: string;
    userId: string | null;
    isLoading: boolean;
    basePath: string;
    isAdmin: boolean;
    isEntryManager: boolean;
    isInitializing: boolean;
}

export interface AuthActionsValue {
    logIn: (
        username: string,
        password: string,
        twoFactorToken?: string | null,
    ) => Promise<LoginResult>;
    logOut: () => Promise<void>;
    getAccessToken: () => Promise<string>;
    isLoggedIn: () => boolean;
    setTokensDirectly: (data: TokenData) => void;
}

export const AuthStateContext = createContext<AuthStateValue | undefined>(undefined);
export const AuthActionsContext = createContext<AuthActionsValue | undefined>(
    undefined,
);
