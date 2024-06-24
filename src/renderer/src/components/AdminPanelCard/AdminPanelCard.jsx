import { Trash } from 'iconoir-react/regular';
import { useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { deleteEntity } from '../../services/adminService/adminService';
import { Link, useNavigate } from 'react-router-dom';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';

/**
 * AdminPanelCard component - This component is used to display a card for the AdminPanel.
 * The card contains the following information:
 * - Name
 * - Delete button
 * When the delete button is clicked a dialog will be displayed to confirm the deletion.
 * When clicking the name the user will be redirected to the entity dashboard.
 * 
 * @function AdminPanelCard
 * @param {Object} props - The props object
 * @param {string} props.name - The name of the entity
 * @param {string} props.id - The id of the entity
 * @param {string} props.description - The description of the entity
 * @param {string} props.type - The type of the entity
 * @param {Function} props.onDelete - The function to call when the entity is deleted
 * @param {string} props.link - The link to the entity dashboard
 * @param {string} props.searchKey - The search key for the entity. used by the `useFrontendSearch` hook
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
}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();

    const handleDelete = async () => {
        deleteEntity(type, id)
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
                    <Link to={link}>{name}</Link>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={() => setDialog(!dialog)}
                    >
                        <Trash />
                    </button>
                </div>
            </div>
        </>
    );
}
