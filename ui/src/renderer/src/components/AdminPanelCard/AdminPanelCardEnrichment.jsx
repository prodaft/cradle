import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import EnrichmentSettingsForm from '../AdminPanelForms/EnrichmentSettingsForm';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function AdminPanelCardEnrichment({ name, id, setRightPane }) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();

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
