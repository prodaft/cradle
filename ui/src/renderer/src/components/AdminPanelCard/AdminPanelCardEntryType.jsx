import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { deleteArtifactClass } from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useAuth from '../../hooks/useAuth/useAuth';
import EntryTypeForm from '../AdminPanelForms/EntryTypeForm.jsx';

export default function AdminPanelCardEntryType({
    name,
    id,
    count,
    onDelete,
    setRightPane,
}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const auth = useAuth();

    const handleDelete = async () => {
        try {
            const response = await deleteArtifactClass(id);
            if (response.status === 200) onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        navigate(`/activity?content_type=entryclass&object_id=${id}`);
    };

    const handleEditClick = () => {
        setRightPane(<EntryTypeForm id={id} isEdit={true} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ConfirmationDialog
                open={dialog}
                setOpen={setDialog}
                title='Confirm Deletion'
                description='This is permanent'
                handleConfirm={handleDelete}
            />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <span className='cursor-pointer' onClick={handleEditClick}>
                    <h2 className='card-header w-full mx-2 px-1 break-all'>
                        ({count == 100 ? '99+' : count}) {name}
                    </h2>
                </span>
                <div className='w-full flex flex-row justify-end'>
                    {auth?.isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={handleActivityClick}
                        >
                            <ClockRotateRight />
                        </button>
                    )}
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={handleEditClick}
                    >
                        <EditPencil />
                    </button>
                    {auth?.isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={() => setDialog((prev) => !prev)}
                        >
                            <Trash />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
