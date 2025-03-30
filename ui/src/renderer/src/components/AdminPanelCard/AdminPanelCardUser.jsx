import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { deleteUser } from '../../services/userService/userService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useAuth from '../../hooks/useAuth/useAuth';
import AccountSettings from '../AccountSettings/AccountSettings';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions/AdminPanelUserPermissions';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';
import { useModal } from '../../contexts/ModalContext/ModalContext';

export default function AdminPanelCardUser({ name, id, onDelete, setRightPane }) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const auth = useAuth();
    const { setModal } = useModal();

    const handleDelete = async () => {
        try {
            const response = await deleteUser(id);
            if (response.status === 200) onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        navigate(`/activity/${name}`);
    };

    const handleEditClick = () => {
        setRightPane(<AccountSettings target={id} />);
    };

    const handleUserClick = () => {
        setRightPane(<AdminPanelUserPermissions username={name} id={id} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleUserClick}>
                        {name}
                    </span>
                </h2>
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
                            onClick={() =>
                                setModal(ConfirmDeletionModal, {
                                    text: 'Are you sure you want to delete this user? This is not reversible.',
                                    onConfirm: handleDelete,
                                    confirmText: name,
                                })
                            }
                        >
                            <Trash />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
