import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import { EditPencil } from 'iconoir-react/regular';
import { ReactNode } from 'react';
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
