import { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi/useApi';
import useAuth from '../../hooks/useAuth/useAuth';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import useFrontendSearch from '../../hooks/useFrontendSearch/useFrontendSearch';
import { naturalSort } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AdminPanelPermissionCard from '../AdminPanelPermissionCard/AdminPanelPermissionCard';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Tooltip from '../Tooltip/Tooltip';

/**
 * AdminPanelUserPermissions component - This component is used to display the permissions for a specific user.
 * The component displays the following information:
 * - User permissions
 * The component will display the permissions for the user for each entity.
 * The component will allow changing the access level for the user.
 *
 * @function AdminPanelUserPermissions
 * @returns {AdminPanelUserPermissions}
 * @constructor
 */
export default function AdminPanelUserPermissions({ username, id }) {
    const [entities, setEntities] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { accessApi, usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const auth = useAuth();

    const { searchVal, setSearchVal, filteredChildren } = useFrontendSearch(entities);

    const simulateSession = () => {
        usersApi
            .usersManageRetrieve({ userId: id, actionName: 'simulate' })
            .then((res) => {
                // Backend returns access, refresh, and expiration times
                auth.setTokensDirectly(res);
                navigate('/', { replace: true });
            })
            .catch(displayError(setAlert, navigate));
    };

    const sendEmailConfirmation = () => {
        usersApi
            .usersManageRetrieve({ userId: id, actionName: 'send_email_confirmation' })
            .then((res) => {
                setAlert({
                    show: true,
                    message: 'Email confirmation sent successfully',
                    color: 'green',
                });
            })
            .catch(displayError(setAlert, navigate));
    };

    const sendPasswordResetEmail = () => {
        usersApi
            .usersManageRetrieve({ userId: id, actionName: 'password_reset_email' })
            .then((res) => {
                setAlert({
                    show: true,
                    message: 'Password reset email sent successfully',
                    color: 'green',
                });
            })
            .catch(displayError(setAlert, navigate));
    };

    useEffect(() => {
        accessApi
            .accessUserList({ userId: id })
            .then((permissions) => {
                setEntities(
                    permissions
                        .map((c) => {
                            return (
                                <AdminPanelPermissionCard
                                    key={c.name}
                                    userId={id}
                                    text={c.name}
                                    entityId={c.id}
                                    searchKey={c.name}
                                    accessLevel={c.accessType}
                                />
                            );
                        })
                        .sort((a, b) => {
                            const aKey = a.key?.toString() || '';
                            const bKey = b.key?.toString() || '';
                            return naturalSort(aKey, bKey);
                        }),
                );
            })
            .catch(displayError(setAlert, navigate));
    }, [id, accessApi]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full overflow-x-hidden overflow-y-scroll'>
                <div className='container w-[90%] mx-auto py-4 center'>
                    <h1 className='text-3xl font-bold my-4'>
                        User Settings:
                        <span className='text-3xl text-zinc-500'> {username}</span>
                    </h1>
                    <div className='bg-gray-2 p-4 rounded-md'>
                        <div
                            id='actions'
                            className='w-full h-fit mt-1 flex flex-row justify-start items-center text-zinc-400 pb-2'
                        >
                            <Tooltip content={'Jump into a session for this user'}>
                                <button
                                    id='simulate-user'
                                    data-testid='simulate-user'
                                    name='simulate-user'
                                    type='button'
                                    className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 ml-2'
                                    onClick={simulateSession}
                                >
                                    Simulate
                                </button>
                            </Tooltip>
                            <Tooltip content={'Send email confirmation'}>
                                <button
                                    id='email-confirmation'
                                    data-testid='email-confirmation'
                                    name='email-confirmation'
                                    type='button'
                                    className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 ml-2'
                                    onClick={sendEmailConfirmation}
                                >
                                    Email Confirmation
                                </button>
                            </Tooltip>
                            <Tooltip content={'Send password reset email'}>
                                <button
                                    id='password-reset'
                                    data-testid='password-reset'
                                    name='password-reset'
                                    type='button'
                                    className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 ml-2'
                                    onClick={sendPasswordResetEmail}
                                >
                                    Password Reset
                                </button>
                            </Tooltip>
                        </div>

                        <div className='w-full h-12 my-2'>
                            <input
                                type='text'
                                placeholder='Search'
                                className='form-input input input-rounded input-md input-block input-ghost-primary focus:ring-0 w-full'
                                onChange={(e) => setSearchVal(e.target.value)}
                            />
                        </div>
                        <div className='w-full rounded-lg my-2 h-[80vh] overflow-y-auto'>
                            {filteredChildren.sort((a, b) => a.key - b.key)}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
