/**
 * useProfile hook - Replaces ProfileContext
 * Uses TanStack Query for data fetching and cache management
 */

import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import type { Profile } from '@/types/index';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Extended profile with additional fields
 */
export interface ExtendedProfile extends Profile {
    defaultNoteTemplate?: string;
    role?: string;
    vimMode?: boolean;
}

const meKey = queryKeys.users.detail('me');
const templateKey = ['users', 'me', 'defaultNoteTemplate'] as const;

/**
 * Hook to access user profile data
 * Replaces ProfileContext - uses TanStack Query as the data layer
 *
 * @returns Profile data, setters, and role check helpers
 */
export function useProfile() {
    const { usersApi } = useApi();
    const { isLoggedIn } = useAuthActions();
    const qc = useQueryClient();

    const me = useQuery({
        queryKey: meKey,
        queryFn: () => usersApi.usersRetrieve({ userId: 'me' }),
        enabled: isLoggedIn(),
        meta: { showErrorToast: false },
    });

    const template = useQuery({
        queryKey: templateKey,
        queryFn: () => usersApi.usersDefaultNoteTemplateRetrieve({ userId: 'me' }),
        enabled: isLoggedIn() && !!me.data,
        meta: { showErrorToast: false },
    });

    const profile: ExtendedProfile | null = me.data
        ? {
              ...(me.data as ExtendedProfile),
              defaultNoteTemplate: (template.data as any)?.template,
          }
        : null;

    const setProfile = (
        updater:
            | ExtendedProfile
            | null
            | ((prev: ExtendedProfile | null) => ExtendedProfile | null),
    ) => {
        qc.setQueryData(meKey, (prev: unknown) =>
            typeof updater === 'function'
                ? updater(prev as ExtendedProfile | null)
                : updater,
        );
    };

    const isAdmin = (): boolean => profile?.role === 'admin';
    const isEntryManager = (): boolean =>
        profile?.role === 'entrymanager' || profile?.role === 'admin';

    return {
        profile,
        setProfile,
        isAdmin,
        isEntryManager,
    };
}
