import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {getPermissions} from "../../services/adminService/adminService";
import {useAuth} from "../../hooks/useAuth/useAuth";
import AdminPanelPermissionCard from "../AdminPanelPermissionCard/AdminPanelPermissionCard";
import useFrontendSearch from "../../hooks/useFrontendSearch/useFrontendSearch";

/**
 * AdminPanelUserPermissions component - This component is used to display the permissions for a specific user.
 * The component displays the following information:
 * - User permissions
 * The component will display the permissions for the user for each case.
 * The component will allow changing the access level for the user.
 * @returns {JSX.Element}
 * @constructor
 */
export default function AdminPanelUserPermissions() {
    const { username, id } = useParams();
    const [cases, setCases] = useState([]);
    const auth = useAuth();

    const { searchVal, setSearchVal, filteredChildren } = useFrontendSearch(cases);

    useEffect(() => {
        // Fetch cases for user
        // Use the id to fetch the cases for the user
        // Display the cases in the component
        getPermissions(auth.access,id).then((response) => {
            if(response.status === 200){
                let permissions = response.data;
                setCases(permissions.map((c) => {
                    return (
                        <AdminPanelPermissionCard userId={id} caseName={c["name"]} caseId={c["id"]} searchKey={c["name"]} accessLevel={c["access_type"]} />
                    );
                }));
            }
        }).catch((error) => {
            console.log(error);
        });
    }, [id]);

    return (
        <div className="w-full h-full overflow-x-hidden overflow-y-scroll">
            <div className="w-full h-full bg-gray-2 p-10">
                <h1 className="text-3xl font-bold">User Permissions</h1>
                <h2 className="text-xl font-bold mt-5">User: {username}</h2>
                <div className="w-full h-12 my-2">
                    <input
                        type="text"
                        placeholder="Search"
                        className="input input-rounded input-md input-block input-ghost-primary focus:ring-0 w-full"
                        onChange={(e) => setSearchVal(e.target.value)}
                    />
                </div>
                <div className="w-full h-fit bg-gray-3 rounded-lg my-2">
                    {filteredChildren}
                </div>
            </div>
        </div>
    );
}