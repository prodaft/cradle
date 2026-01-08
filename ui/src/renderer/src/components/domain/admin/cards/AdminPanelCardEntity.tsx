import { useModal } from '@/contexts/ui/ModalContext';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import EntityForm from '../forms/EntityForm';

interface AdminPanelCardEntityProps {
    name: string;
    id: number | string;
    link: string;
    onDelete: () => void;
    typename: string;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardEntity({
    name,
    id,
    link,
    onDelete,
    typename,
    setRightPane,
}: AdminPanelCardEntityProps) {
    const { executor } = useAPICall();
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    const handleDelete = executor(
        async () => {
            await entriesApi.entitiesDestroy({ entityId: Number(id) });
            onDelete();
        },
        { successMessage: 'Entity deleted successfully' },
    );

    const handleActivityClick = () => {
        setRightPane(
            <ActivityList
                content_type='entry'
                objectId={String(id)}
                name={name}
                key={String(id)}
            />,
        );
    };

    const handleEditClick = () => {
        setRightPane(<EntityForm id={Number(id)} isEdit={true} />);
    };

    return (
        <Card
            className='cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>
                    <span className='text-cradle-text-muted mr-2'>{typename}:</span>
                    {name}
                </CardTitle>
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
                            handleEditClick();
                        }}
                        title='Edit'
                    >
                        <EditPencil />
                    </Button>
                    {isAdmin() && (
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={(e) => {
                                e.stopPropagation();
                                setModal(ConfirmDeletionModal, {
                                    onConfirm: handleDelete,
                                    confirmText: `${typename}:${name}`,
                                    text: 'Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.',
                                });
                            }}
                            title='Delete'
                        >
                            <Trash />
                        </Button>
                    )}
                </CardAction>
            </CardHeader>
        </Card>
    );
}
