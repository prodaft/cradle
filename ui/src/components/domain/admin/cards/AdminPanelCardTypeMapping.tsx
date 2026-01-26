import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import { startCase } from 'lodash';
import { ReactNode } from 'react';
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
            className='bg-card/20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleEditClick}
        >
            <CardHeader>
                <CardTitle>{startCase(name)}</CardTitle>
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
                        <PencilSimpleIcon size={16} weight='bold' />
                    </Button>
                </CardAction>
            </CardHeader>
        </Card>
    );
}
