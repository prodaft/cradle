import { capitalizeString } from '@/utils/dashboard';
import { EditPencil } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TypeMappingsEditor from '../TypeMappingsEditor';

interface AdminPanelCardTypeMappingProps {
    name: string;
    id: string;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardTypeMapping({
    name,
    id,
    setRightPane,
}: AdminPanelCardTypeMappingProps) {
    const handleEditClick = () => {
        setRightPane(<TypeMappingsEditor id={id} name={name} onSave={() => {}} />);
    };

    return (
        <Card
            className='bg-cradle3 bg-opacity-20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>{capitalizeString(name)}</CardTitle>
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
