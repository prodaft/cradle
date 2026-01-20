import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import { ComponentType } from 'react';

interface AdminPanelCardManagementProps {
    name: string;
    id: string;
    SettingComponent: ComponentType;
    onNavigate: (id: string) => void;
}

export default function AdminPanelCardManagement({
    name,
    id,
    SettingComponent,
    onNavigate,
}: AdminPanelCardManagementProps) {
    const handleClick = () => {
        onNavigate(id);
    };

    return (
        <Card
            className='bg-card/20 cursor-pointer hover:shadow-lg transition-shadow'
            onClick={handleClick}
        >
            <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardAction>
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                        title='Edit'
                    >
                        <PencilSimpleIcon size={16} weight="bold" />
                    </Button>
                </CardAction>
            </CardHeader>
        </Card>
    );
}
