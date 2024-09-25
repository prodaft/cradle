import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { deleteArtifactClass, deleteEntry } from '../../services/adminService/adminService';
import { Link, useNavigate } from 'react-router-dom';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { Archive } from 'iconoir-react';

/**
 * AdminPanelCard component - This component is used to display a card for the AdminPanel.
 * The card contains the following information:
 * - Name
 * - Delete button
 * When the delete button is clicked a dialog will be displayed to confirm the deletion.
 * When clicking the name the user will be redirected to the entry dashboard.
 *
 * @function AdminPanelCard
 * @param {Object} props - The props object
 * @param {string} props.name - The name of the entry
 * @param {string} props.id - The id of the entry
 * @param {string} props.description - The description of the entry
 * @param {string} props.type - The type of the entry
 * @param {Function} props.onDelete - The function to call when the entry is deleted
 * @param {string} props.link - The link to the entry dashboard
 * @param {string} props.searchKey - The search key for the entry. used by the `useFrontendSearch` hook
 * @returns {AdminPanelCard}
 * @constructor
 */
export default function AdminPanelCard({
    name,
    id,
    description,
    type,
    onDelete,
    link,
    searchKey,
    typename,
}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();

    const handleDelete = async () => {
        (type == "entity" ? deleteEntry(type, id): (type == "artifact" ? deleteArtifactClass(id) : null))
            .then((response) => {
                if (response.status === 200) {
                    onDelete();
                }
            })
            .catch(displayError(setAlert, navigate));
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title={'Confirm Deletion'}
                description={'This is permanent'}
                handleConfirm={handleDelete}
            />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>

                    <Link to={link}>
                      {type == "entity" && (
                          <span className='text-zinc-500'>{`${typename}:`}</span>
                      )}{name}
                    </Link>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={() => navigate(`/admin/${type}/activity/`)}
                    >
                        { type != "artifact" && (<ClockRotateRight />)}
                    </button>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={() => navigate(typename ? '/admin/edit-entity/' + id : '/admin/edit-artifact-type/' + id.replace('/', '--'))}
                    >

                        { type != "user" && (<EditPencil />)}
                    </button>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={() => setDialog(!dialog)}
                    >
                        { type == "entity" ? (<Archive />) : (<Trash />)}
                    </button>
                </div>
            </div>
        </>
    );
}
