import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import { useAPICall } from '../../hooks/useAPICall';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import ActivityList from '../ActivityList/ActivityList.jsx';
import EntryTypeForm from '../AdminPanelForms/EntryTypeForm.jsx';
import Card from '../Card/Card';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

export default function AdminPanelCardEntryType({
    name,
    id,
    count,
    onDelete,
    setRightPane,
}) {
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
        { successMessage: 'Entry type deleted successfully' }
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
                    onConfirm: handleDelete,
                    confirmText: name,
                    text: 'Are you sure you want to delete this entry type? This action is irreversible.',
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
                prefix={`(${count >= 0 ? (count == 100 ? '99+' : count) : 0}) `}
                actions={actions}
                onClick={handleEditClick}
            />
        </>
    );
}
