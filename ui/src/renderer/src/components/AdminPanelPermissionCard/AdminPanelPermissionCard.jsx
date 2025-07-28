import { NavArrowDown } from 'iconoir-react';
import { useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { changeAccess } from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

/**
 * AdminPanelUserPermissions component - This component is used to display the permissions for a user.
 * The component displays the following information:
 * - Entity name
 * - Access level
 * The component contains a dropdown to change the access level for the user.
 * The component will display an alert if an error occurs.
 * The component will display the current access level.
 *
 * @function AdminPanelPermissionCard
 * @param {Object} props - The props object
 * @param {string} props.userId - The id of the user
 * @param {string} props.entityName - The name of the entity
 * @param {string} props.entityId - The id of the entity
 * @param {string} props.accessLevel - The access level of the user
 * @param {string} props.searchKey - The search key for the user
 * @returns {AdminPanelPermissionCard}
 * @constructor
 */
export default function AdminPanelPermissionCard({
    userId,
    entityName,
    entityId,
    accessLevel,
    searchKey,
}) {
    const [currentAccess, setCurrentAccess] = useState(accessLevel);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();

    const handleChange = async (newAccess) => {
        if (currentAccess !== newAccess) {
            changeAccess(userId, entityId, newAccess)
                .then((response) => {
                    if (response.status === 200) {
                        setCurrentAccess(newAccess);
                    }
                })
                .catch(displayError(setAlert, navigate));
        }
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-4 my-1 bg-opacity-20 rounded-xl flex flex-row justify-start'>
                <h2 className='card-header w-full mx-2'>{entityName}</h2>
                <div className='w-full flex flex-row justify-end'>
                    <div className='dropdown'>
                        <label
                            className='btn btn-ghost my-2'
                            tabIndex='0'
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
                                tabIndex='-1'
                                className='dropdown-item text-sm'
                                onClick={() => handleChange('read')}
                            >
                                read
                            </a>
                            <a
                                tabIndex='-1'
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
