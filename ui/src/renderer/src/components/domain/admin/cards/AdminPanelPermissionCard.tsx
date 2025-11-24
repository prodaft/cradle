import { NavArrowDown } from 'iconoir-react';
import { useState } from 'react';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';

type AccessLevel = 'none' | 'read' | 'read-write';

interface AdminPanelPermissionCardProps {
    userId: number | string;
    text: string;
    entityId: number | string;
    accessLevel: AccessLevel;
    searchKey: string;
}

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
    const { navigate, navigateLink } = useCradleNavigate();

    const handleChange = async (newAccess: AccessLevel) => {
        if (currentAccess !== newAccess) {
            execute(
                () => accessApi.accessUserUpdate({
                    userId: Number(userId),
                    entityId: Number(entityId),
                    accessRequest: { accessType: newAccess },
                }),
                { successMessage: 'Access updated successfully' }
            ).then(() => {
                setCurrentAccess(newAccess);
            }).catch(() => {
                // Error already handled by execute
            });
        }
    };

    return (
        <>
            <div className='h-fit w-full bg-cradle3 p-4 my-1 bg-opacity-20 rounded-xl flex flex-row justify-start'>
                <h2 className='card-header w-full mx-2'>{text}</h2>
                <div className='w-full flex flex-row justify-end'>
                    <div className='dropdown'>
                        <label
                            className='btn btn-ghost my-2'
                            tabIndex={0}
                            data-testid='accessLevelDisplay'
                        >
                            {currentAccess}{' '}
                            <NavArrowDown
                                color='gray-12'
                                height='1.5em'
                                width='1.5em'
                            />
                        </label>
                        <div className='dropdown-menu'>
                            <a
                                className='dropdown-item text-sm'
                                onClick={() => handleChange('none')}
                            >
                                none
                            </a>
                            <a
                                tabIndex={-1}
                                className='dropdown-item text-sm'
                                onClick={() => handleChange('read')}
                            >
                                read
                            </a>
                            <a
                                tabIndex={-1}
                                className='dropdown-item text-sm'
                                onClick={() => handleChange('read-write')}
                            >
                                read-write
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
