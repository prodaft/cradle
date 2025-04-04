import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPermissions, manageUser } from '../../services/adminService/adminService';
import AdminPanelPermissionCard from '../AdminPanelPermissionCard/AdminPanelPermissionCard';
import useFrontendSearch from '../../hooks/useFrontendSearch/useFrontendSearch';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useAuth from '../../hooks/useAuth/useAuth';

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
export default function AdminPanelUserPermissions() {
    const { username, id } = useParams();
    const [entities, setEntities] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const auth = useAuth();

    const { searchVal, setSearchVal, filteredChildren } = useFrontendSearch(entities);

    const simulateSession = () => {
        manageUser(id, 'simulate')
            .then((res) => {
                auth.logIn(res.data['access'], res.data['refresh']);
                navigate('/', { replace: true });
            })
            .catch(displayError(setAlert, navigate));
    };

    const sendEmailConfirmation = () => {
        manageUser(id, 'send_email_confirmation')
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
        manageUser(id, 'password_reset_email')
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
        getPermissions(id)
            .then((response) => {
                if (response.status === 200) {
                    let permissions = response.data;
                    setEntities(
                        permissions.map((c) => {
                            return (
                                <AdminPanelPermissionCard
                                    key={c['id']}
                                    userId={id}
                                    entityName={c['name']}
                                    entityId={c['id']}
                                    searchKey={c['name']}
                                    accessLevel={c['access_type']}
                                />
                            );
                        }),
                    );
                }
            })
            .catch(displayError(setAlert, navigate));
    }, [id]);

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full overflow-x-hidden overflow-y-scroll'>
                <div className='container w-[70%] h-fit mx-auto my-4 center bg-gray-2 p-10 rounded-md'>
                    <h1 className='text-3xl font-bold'>
                        User Settings:
                        <span className='text-3xl text-zinc-500'> {username}</span>
                    </h1>
                    <br />
                    <div
                        id='actions'
                        className='w-full h-fit mt-1 flex flex-row justify-start items-center text-zinc-400'
                    >
                        <h3 className='text-l font-bold mr-2'>Actions:</h3>
                        <button
                            id='edit-user'
                            data-testid='edit-user'
                            name='edit-user'
                            type='button'
                            className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary'
                            data-tooltip={'Edit this user'}
                            onClick={() => navigate(`/account/${id}`)}
                        >
                            Edit
                        </button>
                        <button
                            id='simulate-user'
                            data-testid='simulate-user'
                            name='simulate-user'
                            type='button'
                            className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary ml-2'
                            data-tooltip={'Jump into a session for this user'}
                            onClick={simulateSession}
                        >
                            Simulate
                        </button>
                        <button
                            id='email-confirmation'
                            data-testid='email-confirmation'
                            name='email-confirmation'
                            type='button'
                            className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary ml-2'
                            data-tooltip={'Send email confirmation'}
                            onClick={sendEmailConfirmation}
                        >
                            Email Confirmation
                        </button>
                        <button
                            id='password-reset'
                            data-testid='password-reset'
                            name='password-reset'
                            type='button'
                            className='btn btn-solid-primary flex flex-row items-center hover:bg-gray-4 tooltip tooltip-bottom tooltip-primary ml-2'
                            data-tooltip={'Send password reset email'}
                            onClick={sendPasswordResetEmail}
                        >
                            Password Reset
                        </button>
                    </div>

                    <div className='w-full h-12 my-2'>
                        <input
                            type='text'
                            placeholder='Search'
                            className='form-input input input-rounded input-md input-block input-ghost-primary focus:ring-0 w-full'
                            onChange={(e) => setSearchVal(e.target.value)}
                        />
                    </div>
                    <div className='w-full h-fit rounded-lg my-2'>
                        {filteredChildren}
                    </div>
                </div>
            </div>
        </>
    );
}
