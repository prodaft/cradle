import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import EnrichmentSettingsForm from '../AdminPanelForms/EnrichmentSettingsForm';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Card from '../Card/Card';

export default function AdminPanelCardEnrichment({ name, id, setRightPane }) {
    const [dialog, setDialog] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();

    const handleEditClick = () => {
        setRightPane(<EnrichmentSettingsForm enrichment_class={id} />);
    };

    const actions = [
        {
            icon: <EditPencil />,
            onClick: handleEditClick,
            tooltip: 'Edit',
            variant: 'ghost',
        },
    ];

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card
                title={name}
                actions={actions}
                onClick={handleEditClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
