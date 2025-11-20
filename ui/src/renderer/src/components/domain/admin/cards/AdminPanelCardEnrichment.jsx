import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import EnrichmentSettingsForm from '../forms/EnrichmentSettingsForm';
import Card from '../../../base/Card/Card';

export default function AdminPanelCardEnrichment({ name, id, setRightPane }) {
    const [dialog, setDialog] = useState(false);
    const { notify } = useNotif();
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
                        <Card
                title={name}
                actions={actions}
                onClick={handleEditClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
