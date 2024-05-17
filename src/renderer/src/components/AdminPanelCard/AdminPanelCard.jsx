import {Bin} from "iconoir-react/regular";
import {useState} from "react";
import {ConfirmationDialog} from "../ConfirmationDialog/ConfirmationDialog";
import {deleteEntity} from "../../services/adminService/adminService";
import {useAuth} from "../../hooks/useAuth/useAuth";
import {Link} from "react-router-dom";
import {AlertDismissible} from "../AlertDismissible/AlertDismissible";

/**
 * AdminPanelCard component - This component is used to display a card for the AdminPanel.
 * The card contains the following information:
 * - Name
 * - Delete button
 * When the delete button is clicked a dialog will be displayed to confirm the deletion.
 * When clicking the name the user will be redirected to the entity dashboard.
 * @param name
 * @param id
 * @param description
 * @param type
 * @param onDelete
 * @param link
 * @returns {JSX.Element}
 * @constructor
 */
export default function AdminPanelCard({name,id,description,type,onDelete,link,searchKey}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState(false);
    const auth = useAuth();

    const handleDelete = async () => {
        deleteEntity(auth.access,type,id).then((response) => {
           if(response.status === 200){
               onDelete();
           }
        }).catch((error) => {
            if(error.response && error.response.status === 401){
                setAlert(true);
            }else {
                setAlert(true);
            }
        });
    }

    return (
        <>
            <AlertDismissible open={alert} setOpen={setAlert} content={"Error deleting entity"}/>
            <ConfirmationDialog open={dialog} setOpen={setDialog} title={"Confirm Deletion"} description={"This is permanent"} handleConfirm={handleDelete} />
            <div className="h-fit w-full bg-gray-3 p-2 rounded-xl">
                <h2 className="card-header w-full"><Link to={link}>{name}</Link></h2>
                    <div className="w-full flex flex-row justify-end">
                        <button className="btn btn-ghost w-fit h-full p-1" onClick={() => setDialog(!dialog)}>
                            <Bin/>
                        </button>
                    </div>
            </div>
        </>

    );
}