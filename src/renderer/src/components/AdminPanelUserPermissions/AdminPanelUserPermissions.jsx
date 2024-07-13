import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPermissions } from '../../services/adminService/adminService';
import AdminPanelPermissionCard from '../AdminPanelPermissionCard/AdminPanelPermissionCard';
import useFrontendSearch from '../../hooks/useFrontendSearch/useFrontendSearch';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';

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

    const { searchVal, setSearchVal, filteredChildren } = useFrontendSearch(entities);

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
                    <h1 className='text-3xl font-bold'>User Permissions</h1>
                    <h2 className='text-xl font-bold mt-5'>User: {username}</h2>
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
