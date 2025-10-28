import { createContext, useContext, useEffect } from 'react';
import useApi from '../../hooks/useApi/useApi';
import useAuth from '../../hooks/useAuth/useAuth';
import { useProfile as useProfileHook } from '../../hooks/useProfile/useProfile';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
    const { profile, setProfile } = useProfileHook();
    const { usersApi } = useApi();
    const auth = useAuth();

    let getUserProfile = async () => {
        try {
            const user = await usersApi.usersRetrieve({ userId: 'me' });
            if (user) {
                setProfile(user);
            } else {
                setProfile(null); // Clear profile if no data is returned
            }

            const defaultNoteTemplate = await usersApi.usersDefaultNoteTemplateRetrieve({
                userId: 'me',
            });
            if (defaultNoteTemplate && defaultNoteTemplate.template) {
                // Assuming the default note template is stored in the profile
                setProfile((prevProfile) => ({
                    ...prevProfile,
                    defaultNoteTemplate: defaultNoteTemplate.template,
                }));
            } else {
                setProfile((prevProfile) => ({
                    ...prevProfile,
                    defaultNoteTemplate: '',
                }));
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
