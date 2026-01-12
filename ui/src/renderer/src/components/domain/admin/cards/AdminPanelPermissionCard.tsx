import useApi from '@/hooks/api/useApi';
import { SettingsRadio } from '@components/forms';
import { useMutation } from '@tanstack/react-query';
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
    const { accessApi } = useApi();

    const updateAccessMutation = useMutation({
        mutationFn: async (accessType: AccessLevel) => {
            await accessApi.accessUserUpdate({
                userId: userId,
                entityId: entityId,
                accessRequest: { accessType },
            });
        },
        meta: {
            successMessage: 'Access updated successfully',
        },
        onSuccess: (_, accessType) => {
            setCurrentAccess(accessType as AccessLevel);
        },
    });

    const handleChange = (newAccess: string) => {
        const accessValue = newAccess as AccessLevel;
        if (currentAccess !== accessValue) {
            updateAccessMutation.mutate(accessValue);
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
