import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { useMutation } from '@tanstack/react-query';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { ReactNode, useState } from 'react';
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
    searchKey?: string;
}

export default function AdminPanelCardEntity({
    name,
    id,
    link,
    onDelete,
    typename,
    setRightPane,
    searchKey,
}: AdminPanelCardEntityProps) {
    const { entriesApi } = useApi();
    const { isAdmin } = useAuthState();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await entriesApi.entitiesDestroy({ entityId: Number(id) });
            onDelete();
        },
        meta: {
            successMessage: 'Entity deleted successfully',
        },
    });

    const handleDelete = () => deleteMutation.mutate();

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
        setRightPane(<EntityForm id={Number(id)} />);
    };

    return (
        <Card
            className='cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>
                    <span className='text-muted-foreground mr-2'>{typename}:</span>
                    {name}
                </CardTitle>
                <CardAction>
                    {isAdmin && (
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
                    {isAdmin && (
                        <>
                            <Button
                                variant='ghost'
                                size='icon-sm'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteModalOpen(true);
                                }}
                                title='Delete'
                            >
                                <Trash />
                            </Button>
                            <ConfirmDeletionModal
                                open={deleteModalOpen}
                                onOpenChange={setDeleteModalOpen}
                                onConfirm={handleDelete}
                                confirmText={`${typename}:${name}`}
                                text='Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.'
                            />
                        </>
                    )}
                </CardAction>
            </CardHeader>
        </Card>
    );
}
