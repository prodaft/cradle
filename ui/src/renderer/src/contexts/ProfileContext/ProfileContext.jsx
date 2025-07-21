import React, { createContext, useContext, useEffect } from 'react';
import { useProfile as useProfileHook } from '../../hooks/useProfile/useProfile';
import {
    getUser,
    getDefaultNoteTemplate,
} from '../../services/userService/userService';
import useAuth from '../../hooks/useAuth/useAuth';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
    const { profile, setProfile } = useProfileHook();
    const auth = useAuth();

    let getUserProfile = async () => {
        try {
            const response = await getUser('me');
            if (response && response.data) {
                setProfile(response.data);
            } else {
                setProfile(null); // Clear profile if no data is returned
            }

            const defaultNoteTemplateResponse = await getDefaultNoteTemplate('me');
            if (defaultNoteTemplateResponse && defaultNoteTemplateResponse.data) {
                // Assuming the default note template is stored in the profile
                setProfile((prevProfile) => ({
                    ...prevProfile,
                    defaultNoteTemplate: defaultNoteTemplateResponse.data.template,
                }));
            } else {
                profile.defaultNoteTemplate = '';
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    useEffect(() => {
        if (auth.isAuthenticated()) {
            getUserProfile();
        } else {
            setProfile(null); // Clear profile if not authenticated
        }
    }, [auth]);

    const isAdmin = () => profile && profile.role === 'admin';
    const isEntryManager = () =>
        profile && (profile.role === 'entrymanager' || isAdmin());

    return (
        <ProfileContext.Provider
            value={{ profile, setProfile, isAdmin, isEntryManager }}
        >
            {children}
        </ProfileContext.Provider>
    );
}

// Optional helper hook:
export function useProfile() {
    return useContext(ProfileContext);
}
