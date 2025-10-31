import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useState } from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import ActivityList from '../ActivityList/ActivityList';
import EntityForm from '../AdminPanelForms/EntityForm';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
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
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { isAdmin } = useProfile();
    const { setModal } = useModal();

    const handleDelete = async () => {
        try {
            await entriesApi.entitiesDestroy({ entityId: id });
            onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

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
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card actions={actions} actionsPosition="bottom-right" className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg">
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleEditClick}>
                        <span className='text-zinc-500'>{`${typename}: `}</span>
                        {name}
                    </span>
                </h2>
            </Card>
        </>
    );
}
