import { useState } from 'react';
import { changeAccess } from '../../services/adminService/adminService';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { NavArrowDown } from 'iconoir-react';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate } from 'react-router-dom';

/**
 * AdminPanelUserPermissions component - This component is used to display the permissions for a user.
 * The component displays the following information:
 * - Case name
 * - Access level
 * The component contains a dropdown to change the access level for the user.
 * The component will display an alert if an error occurs.
 * The component will display the current access level.
 * @param userId
 * @param caseName
 * @param caseId
 * @param accessLevel
 * @returns {AdminPanelPermissionCard}
 * @constructor
 */
export default function AdminPanelPermissionCard({
    userId,
    caseName,
    caseId,
    accessLevel,
    searchKey,
}) {
    const [currentAccess, setCurrentAccess] = useState(accessLevel);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();

    const handleChange = async (newAccess) => {
        if (currentAccess !== newAccess) {
            changeAccess(userId, caseId, newAccess)
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
                <h2 className='card-header w-full mx-2'>{caseName}</h2>
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
