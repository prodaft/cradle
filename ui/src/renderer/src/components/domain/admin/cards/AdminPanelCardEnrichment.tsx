import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { EditPencil } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import Card from '../../../base/Card/Card';
import EnrichmentSettingsForm from '../forms/EnrichmentSettingsForm';

interface AdminPanelCardEnrichmentProps {
    name: string;
    id: string;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardEnrichment({
    name,
    id,
    setRightPane,
}: AdminPanelCardEnrichmentProps) {
    const { navigate, navigateLink } = useCradleNavigate();

    const handleEditClick = () => {
        setRightPane(<EnrichmentSettingsForm enrichment_class={id} />);
    };

    const actions = [
        {
            icon: <EditPencil />,
            onClick: handleEditClick,
            tooltip: 'Edit',
            variant: 'ghost' as const,
        },
    ];

    return (
        <>
            <Card
                title={name}
                actions={actions}
                onClick={handleEditClick}
                className='bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg'
            />
        </>
    );
}
