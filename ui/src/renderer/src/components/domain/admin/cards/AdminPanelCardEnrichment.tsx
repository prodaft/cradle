import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { EditPencil } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

    return (
        <Card
            className='bg-card/20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardAction>
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick();
                        }}
                        title='Edit'
                    >
                        <EditPencil />
                    </Button>
                </CardAction>
            </CardHeader>
        </Card>
    );
}
