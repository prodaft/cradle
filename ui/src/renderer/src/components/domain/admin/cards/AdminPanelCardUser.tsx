import { useModal } from '@/contexts/ui/ModalContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import Card from '../../../base/Card/Card';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import AccountSettings from '../../user/AccountSettings';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions';

interface AdminPanelCardUserProps {
    name: string;
    id: number | string;
    onDelete: () => void;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardUser({
    name,
    id,
    onDelete,
    setRightPane,
}: AdminPanelCardUserProps) {
    const { executor } = useAPICall();
    const { usersApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    // Pre-configured delete function with automatic error handling
    const handleDelete = executor(
        async () => {
            await usersApi.usersDestroy({ userId: String(id) });
            onDelete();
        },
        { successMessage: 'User deleted successfully' },
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
        setRightPane(<AccountSettings target={String(id)} />);
    };

    const handleUserClick = () => {
        setRightPane(
            <AdminPanelUserPermissions
                username={name}
                id={String(id)}
                key={String(id)}
            />,
        );
    };

    const actions = [
        {
            icon: <ClockRotateRight />,
            onClick: handleActivityClick,
            tooltip: 'View Activity',
            show: isAdmin(),
            variant: 'ghost' as const,
        },
        {
            icon: <EditPencil />,
            onClick: handleEditClick,
            tooltip: 'Edit',
            variant: 'ghost' as const,
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
            variant: 'danger' as const,
        },
    ];

    return (
        <>
            <Card
                title={name}
                actions={actions}
                onClick={handleUserClick}
                className='bg-cradle3 bg-opacity-20'
            />
        </>
    );
}
