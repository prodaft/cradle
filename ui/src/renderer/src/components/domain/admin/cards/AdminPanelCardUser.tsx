import { useModal } from '@/contexts/ui/ModalContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ClockRotateRight, Lock } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import Card from '../../../base/Card/Card';
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

    const handleUserClick = () => {
        setRightPane(<AccountSettings target={String(id)} />);
    };

    const handlePermissionsClick = () => {
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
            icon: <Lock height={30} width={30} />,
            onClick: handlePermissionsClick,
            tooltip: 'Edit',
            variant: 'ghost' as const,
        }
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
