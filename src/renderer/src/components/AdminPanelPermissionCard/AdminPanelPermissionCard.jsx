import {useState} from "react";
import {useAuth} from "../../hooks/useAuth/useAuth";
import {changeAccess} from "../../services/adminService/adminService";
import {AlertDismissible} from "../AlertDismissible/AlertDismissible";

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
 * @returns {JSX.Element}
 * @constructor
 */
export default function AdminPanelPermissionCard({userId, caseName, caseId, accessLevel, searchKey}) {
    const [currentAccess, setCurrentAccess] = useState(accessLevel);
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState(false);
    const auth = useAuth();

    const handleChange = async (newAccess) => {
        if(currentAccess !== newAccess){
            changeAccess(auth.access,userId,caseId,newAccess).then((response) => {
                if(response.status === 200){
                    setCurrentAccess(newAccess);
                }
            }).catch((error) => {
                setAlert(true);
            });
        }
    }

    return (
        <>
            <AlertDismissible open={alert} setOpen={setAlert} content={"Error changing access level"}/>
            <div className="h-fit w-full bg-gray-3 p-2 flex flex-row justify-start border-b-gray-2 border-b-2">
                <h2 className="card-header w-full">{caseName}</h2>
                <div className="w-full flex flex-row justify-end">
                    <div className="dropdown">
                        <label className="btn btn-ghost my-2" tabIndex="0" data-testid="accessLevelDisplay">{currentAccess}</label>
                        <div className="dropdown-menu">
                            <a className="dropdown-item text-sm" onClick={() => handleChange("none")}>none</a>
                            <a tabIndex="-1" className="dropdown-item text-sm"
                               onClick={() => handleChange("read")}>read</a>
                            <a tabIndex="-1" className="dropdown-item text-sm"
                               onClick={() => handleChange("read-write")}>read-write</a>
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}