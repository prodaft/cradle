import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import { useAPICall } from '../../hooks/useAPICall';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import ActivityList from '../ActivityList/ActivityList';
import EntityForm from '../AdminPanelForms/EntityForm';
import Card from '../Card/Card';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal';

export default function AdminPanelCardEntity({
    name,
    id,
    link,
    onDelete,
    typename,
    setRightPane,
}) {
    const { executor } = useAPICall();
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    const handleDelete = executor(
        async () => {
            await entriesApi.entitiesDestroy({ entityId: id });
            onDelete();
        },
        { successMessage: 'Entity deleted successfully' }
    );

    const handleActivityClick = () => {
        setRightPane(
            <ActivityList content_type='entry' objectId={id} name={name} key={id} />,
        );
    };

    const handleEditClick = () => {
        setRightPane(<EntityForm id={id} isEdit={true} />);
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
                    confirmText: `${typename}:${name}`,
                    text: 'Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.',
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
                prefix={`${typename}:`}
                actions={actions}
                onClick={handleEditClick}
            />
        </>
    );
}
