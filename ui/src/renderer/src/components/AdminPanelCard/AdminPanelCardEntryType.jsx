import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { useState } from 'react';
import { useModal } from '../../contexts/ModalContext/ModalContext';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';
import ActivityList from '../ActivityList/ActivityList.jsx';
import EntryTypeForm from '../AdminPanelForms/EntryTypeForm.jsx';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Card from '../Card/Card';
import ConfirmDeletionModal from '../Modals/ConfirmDeletionModal.jsx';

export default function AdminPanelCardEntryType({
    name,
    id,
    count,
    onDelete,
    setRightPane,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { entriesApi } = useApi();
    const { navigate, navigateLink } = useCradleNavigate();
    const { setModal } = useModal();
    const { isAdmin } = useProfile();

    const handleDelete = async () => {
        try {
            await entriesApi.entryClassesDestroy({ classSubtype: id });
            onDelete();
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

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
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card actions={actions} actionsPosition="bottom-right" className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg">
                <span className='cursor-pointer' onClick={handleEditClick}>
                    <h2 className='card-header w-full mx-2 px-1 break-all'>
                        ({count >= 0 ? (count == 100 ? '99+' : count) : 0}) {name}
                    </h2>
                </span>
            </Card>
        </>
    );
}
