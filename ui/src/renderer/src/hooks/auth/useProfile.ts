/**
 * Hook for managing user profile state
 */

import { type Profile } from '@/types/index';
import { useState } from 'react';

/**
 * Return type for useProfile hook
 */
export interface UseProfileReturn {
    profile: Profile | null;
    setProfile: (profile: Profile | null) => void;
}

/**
 * Hook for managing user profile state
 *
 * @returns Profile state and setter
 */
export function useProfile(): UseProfileReturn {
    const [profile, setProfile] = useState<Profile | null>(null);

    return { profile, setProfile };
}

export default useProfile;
