import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useState } from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { deleteArtifactClass } from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import ActivityList from '../ActivityList/ActivityList.jsx';
import EntryTypeForm from '../AdminPanelForms/EntryTypeForm.jsx';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

export default function AdminPanelCardEntryType({
    name,
    id,
    count,
    onDelete,
    setRightPane,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { isAdmin } = useProfile();

    const handleDelete = async () => {
        try {
            const response = await deleteArtifactClass(id);
            if (response.status === 200) onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        setRightPane(
            <ActivityList
                content_type='entryclass'
                objectId={id}
                name={name}
                key={id}
            />,
        );
    };

    const handleEditClick = () => {
        setRightPane(<EntryTypeForm id={id} isEdit={true} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <span className='cursor-pointer' onClick={handleEditClick}>
                    <h2 className='card-header w-full mx-2 px-1 break-all'>
                        ({count >= 0 ? (count == 100 ? '99+' : count) : 0}) {name}
                    </h2>
                </span>
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
                                    confirmText: name,
                                    text: 'Are you sure you want to delete this entry type? This action is irreversible.',
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
