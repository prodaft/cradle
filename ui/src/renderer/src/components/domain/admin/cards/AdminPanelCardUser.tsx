import { useModal } from '@/contexts/ui/ModalContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ClockRotateRight, Lock } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

    return (
        <Card
            className='bg-cradle3 bg-opacity-20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleUserClick}
        >
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardAction>
                    {isAdmin() && (
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={(e) => {
                                e.stopPropagation();
                                handleActivityClick();
                            }}
                            title='View Activity'
                        >
                            <ClockRotateRight />
                        </Button>
                    )}
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePermissionsClick();
                        }}
                        title='Edit'
                    >
                        <Lock height={20} width={20} />
                    </Button>
                </CardAction>
            </CardHeader>
        </Card>
    );
}
