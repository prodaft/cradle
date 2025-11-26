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
                    onConfirm: handleDelete,
                    confirmText: name,
                    text: 'Are you sure you want to delete this entry type? This action is irreversible.',
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
                prefix={`(${count >= 0 ? (count == 100 ? '99+' : count) : 0}) `}
                actions={actions}
                onClick={handleEditClick}
            />
        </>
    );
}
