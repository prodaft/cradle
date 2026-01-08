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
    const { executor } = useAPICall();
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { isAdmin } = useProfile();

    const handleDelete = executor(
        async () => {
            await entriesApi.entryClassesDestroy({ classSubtype: id });
            onDelete();
        },
        { successMessage: 'Entry type deleted successfully' },
    );

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
        <Card
            className='cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>
                    <span className='text-text-muted-foreground mr-2'>
                        ({count >= 0 ? (count == 100 ? '99+' : count) : 0}){' '}
                    </span>
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
                                    confirmText: name,
                                    text: 'Are you sure you want to delete this entry type? This action is irreversible.',
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
