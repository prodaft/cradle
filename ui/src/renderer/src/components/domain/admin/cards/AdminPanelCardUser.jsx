import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useModal } from '@/contexts/ui/ModalContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import AccountSettings from '../../user/AccountSettings';
import ActivityList from '../../activity/ActivityList';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions';
import Card from '../../../base/Card/Card';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';

export default function AdminPanelCardUser({ name, id, onDelete, setRightPane }) {
    const { executor } = useAPICall();
    const { usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    // Pre-configured delete function with automatic error handling
    const handleDelete = executor(
        async () => {
            await usersApi.usersDestroy({ userId: id });
            onDelete();
        },
        { successMessage: 'User deleted successfully' }
    );

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
            <Card
                title={name}
                actions={actions}
                onClick={handleUserClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
