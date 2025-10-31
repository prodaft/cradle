import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useState } from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AccountSettings from '../AccountSettings/AccountSettings';
import ActivityList from '../ActivityList/ActivityList';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions/AdminPanelUserPermissions';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Card from '../Card/Card';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

export default function AdminPanelCardUser({ name, id, onDelete, setRightPane }) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    const handleDelete = async () => {
        try {
            await usersApi.usersDestroy({ userId: id });
            onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    const handleActivityClick = () => {
        setRightPane(
            <ActivityList
                content_type='entryclass'
                username={name}
                name={name}
                key={name}
            />,
        );
    };

    const handleEditClick = () => {
        setRightPane(<AccountSettings target={id} />);
    };

    const handleUserClick = () => {
        setRightPane(<AdminPanelUserPermissions username={name} id={id} key={id} />);
    };

    const actions = [
        {
            icon: <ClockRotateRight />,
            onClick: handleActivityClick,
            tooltip: 'View Activity',
            show: isAdmin(),
            variant: 'ghost',
        },
        {
            icon: <EditPencil />,
            onClick: handleEditClick,
            tooltip: 'Edit',
            variant: 'ghost',
        },
        {
            icon: <Trash />,
            onClick: () =>
                setModal(ConfirmDeletionModal, {
                    text: 'Are you sure you want to delete this user? This is not reversible.',
                    onConfirm: handleDelete,
                    confirmText: name,
                }),
            tooltip: 'Delete',
            show: isAdmin(),
            variant: 'danger',
        },
    ];

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card
                title={name}
                actions={actions}
                onClick={handleUserClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
