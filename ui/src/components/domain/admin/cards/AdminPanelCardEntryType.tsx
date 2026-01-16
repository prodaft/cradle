import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { useMutation } from '@tanstack/react-query';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { ReactNode, useState } from 'react';
import ConfirmDeletionModal from '../../../dialogs/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import EntryTypeForm from '../forms/EntryTypeForm';

interface AdminPanelCardEntryTypeProps {
    name: string;
    id: string;
    count: number;
    onDelete: () => void;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardEntryType({
    name,
    id,
    count,
    onDelete,
    setRightPane,
}: AdminPanelCardEntryTypeProps) {
    const { entriesApi } = useApi();
    const { isAdmin } = useAuthState();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await entriesApi.entryClassesDestroy({ classSubtype: id });
            onDelete();
        },
        meta: {
            successMessage: 'Entry type deleted successfully',
        },
    });

    const handleDelete = () => deleteMutation.mutate();

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
        setRightPane(<EntryTypeForm id={id} />);
    };

    return (
        <Card
            className='cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>
                    <span className='text-muted-foreground mr-2'>
                        ({count >= 0 ? (count == 100 ? '99+' : count) : 0}){' '}
                    </span>
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
                                confirmText={name}
                                text='Are you sure you want to delete this entry type? This action is irreversible.'
                            />
                        </>
                    )}
                </CardAction>
            </CardHeader>
        </Card>
    );
}
