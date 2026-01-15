import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/api/useApi';
import { ClockRotateRight, Lock } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import ActivityList from '../../activity/ActivityList';
import AdminPanelUserPermissions from '../AdminPanelUserPermissions';
import AdminUserSettings from '../pages/AdminUserSettings';

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
    const { usersApi } = useApi();

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
        setRightPane(<AdminUserSettings userId={String(id)} />);
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
            className='bg-card/20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleUserClick}
        >
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardAction>
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
