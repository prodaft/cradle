import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { deleteEntry } from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import EntityForm from '../AdminPanelForms/EntityForm';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';
import ActivityList from '../ActivityList/ActivityList';

export default function AdminPanelCardEntity({
    name,
    id,
    link,
    onDelete,
    typename,
    setRightPane,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    const handleDelete = async () => {
        try {
            const response = await deleteEntry('entities', id);
            if (response.status === 200) onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        setRightPane(<ActivityList content_type='entry' objectId={id} name={name} />);
    };

    const handleEditClick = () => {
        setRightPane(<EntityForm id={id} isEdit={true} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleEditClick}>
                        <span className='text-zinc-500'>{`${typename}: `}</span>
                        {name}
                    </span>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    {isAdmin() && (
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
                    {isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={() =>
                                setModal(ConfirmDeletionModal, {
                                    onConfirm: handleDelete,
                                    confirmText: `${typename}:${name}`,
                                    text: 'Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.',
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
