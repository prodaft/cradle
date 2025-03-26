import { Trash, EditPencil, ClockRotateRight } from 'iconoir-react/regular';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { deleteEntry } from '../../services/adminService/adminService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import useAuth from '../../hooks/useAuth/useAuth';
import EntityForm from '../AdminPanelForms/EntityForm';
import EnrichmentSettingsForm from '../AdminPanelForms/EnrichmentSettingsForm';

export default function AdminPanelCardEnrichment({
    name,
    id,
    setRightPane,
}) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const navigate = useNavigate();
    const auth = useAuth();

    const handleActivityClick = () => {
        navigate(`/activity?content_type=entry&object_id=${id}`);
    };

    const handleEditClick = () => {
        setRightPane(<EnrichmentSettingsForm enrichment_class={id} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleEditClick}>
                        {name}
                    </span>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    {auth?.isAdmin() && (
                        <button
                            className='btn btn-ghost w-fit h-full p-1'
                            onClick={handleActivityClick}
                        >
                            <ClockRotateRight />
                        </button>
                    )}
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={handleEditClick}
                    >
                        <EditPencil />
                    </button>
                </div>
            </div>
        </>
    );
}
