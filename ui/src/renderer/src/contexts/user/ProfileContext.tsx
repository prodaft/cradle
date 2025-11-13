/**
 * Profile Context Provider
 * Manages user profile state and role-based permissions
 */

import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import useApi from '@/hooks/api/useApi';
import useAuth from '@/hooks/auth/useAuth';
import type { Profile } from '@/types/index';

/**
 * Extended profile with additional fields
 */
export interface ExtendedProfile extends Profile {
  defaultNoteTemplate?: string;
  role?: string;
}

/**
 * Profile context value
 */
export interface ProfileContextValue {
  profile: ExtendedProfile | null;
  setProfile: (profile: ExtendedProfile | null | ((prev: ExtendedProfile | null) => ExtendedProfile | null)) => void;
  isAdmin: () => boolean;
  isEntryManager: () => boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

/**
 * Props for ProfileProvider component
 */
export interface ProfileProviderProps {
  children: ReactNode;
}

/**
 * ProfileProvider component
 * Fetches and manages user profile data
 */
export function ProfileProvider({ children }: ProfileProviderProps): JSX.Element {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const { usersApi } = useApi();
  const auth = useAuth();

  const getUserProfile = async (): Promise<void> => {
    try {
      const user = await usersApi.usersRetrieve({ userId: 'me' });
      if (user) {
        setProfile(user as ExtendedProfile);
      } else {
        setProfile(null); // Clear profile if no data is returned
      }

      const defaultNoteTemplate = await usersApi.usersDefaultNoteTemplateRetrieve({
        userId: 'me',
      });
      if (defaultNoteTemplate && defaultNoteTemplate.template) {
        // Assuming the default note template is stored in the profile
        setProfile((prevProfile) => {
          if (!prevProfile) return null;
          return {
            ...prevProfile,
            defaultNoteTemplate: defaultNoteTemplate.template || undefined,
          };
        });
      } else {
        setProfile((prevProfile) => {
          if (!prevProfile) return null;
          return {
            ...prevProfile,
            defaultNoteTemplate: undefined,
          };
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    if (auth.isLoggedIn()) {
      getUserProfile();
    } else {
      setProfile(null); // Clear profile if not authenticated
    }
  }, [auth, usersApi]);

  const isAdmin = (): boolean => profile !== null && profile.role === 'admin';
  const isEntryManager = (): boolean =>
    profile !== null && (profile.role === 'entrymanager' || isAdmin());

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isAdmin, isEntryManager }}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Hook to access profile context
 *
 * @returns Profile context value
 * @throws Error if used outside ProfileProvider
 */
export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
