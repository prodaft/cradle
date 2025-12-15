import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { SettingsRadio } from '@components/forms';
import { useState } from 'react';

type AccessLevel = 'none' | 'read' | 'read-write';

interface AdminPanelPermissionCardProps {
    userId: string;
    text: string;
    entityId: number;
    accessLevel: AccessLevel;
    searchKey: string;
}

const ACCESS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'read', label: 'Read' },
    { value: 'read-write', label: 'Read-Write' },
];

/**
 * AdminPanelPermissionCard component - Displays and manages user permissions for an entity
 */
export default function AdminPanelPermissionCard({
    userId,
    text,
    entityId,
    accessLevel,
    searchKey,
}: AdminPanelPermissionCardProps) {
    const [currentAccess, setCurrentAccess] = useState<AccessLevel>(accessLevel);
    const { execute } = useAPICall();
    const { accessApi } = useApi();

    const handleChange = async (newAccess: string) => {
        const accessValue = newAccess as AccessLevel;
        if (currentAccess !== accessValue) {
            execute(
                () =>
                    accessApi.accessUserUpdate({
                        userId: userId,
                        entityId: entityId,
                        accessRequest: { accessType: accessValue },
                    }),
                { successMessage: 'Access updated successfully' },
            )
                .then(() => {
                    setCurrentAccess(accessValue);
                })
                .catch(() => {
                    // Error already handled by execute
                });
        }
    };

    return (
        <div className='rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-1'>
            <SettingsRadio
                label={text}
                description={`Entity access permissions`}
                name={`access-${entityId}`}
                options={ACCESS_OPTIONS}
                value={currentAccess}
                onChange={handleChange}
                layout='horizontal'
            />
        </div>
    );
}
