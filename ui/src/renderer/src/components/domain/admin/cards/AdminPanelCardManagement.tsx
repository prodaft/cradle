import { EditPencil } from 'iconoir-react';
import { ComponentType, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminPanelCardManagementProps {
    name: string;
    SettingComponent: ComponentType;
    setRightPane: (content: ReactNode) => void;
}

export default function AdminPanelCardManagement({
    name,
    SettingComponent,
    setRightPane,
}: AdminPanelCardManagementProps) {
    const handleClick = () => {
        setRightPane(<SettingComponent />);
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
                        <EditPencil />
                    </Button>
                </CardAction>
            </CardHeader>
        </Card>
    );
}
