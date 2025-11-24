import { EditPencil } from 'iconoir-react';
import { ComponentType, ReactNode } from 'react';
import Card from '../../../base/Card/Card';

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

    const actions = [
        {
            icon: <EditPencil />,
            onClick: handleClick,
            tooltip: 'Edit',
            variant: 'ghost' as const,
        },
    ];

    return (
        <>
            <Card
                title={name}
                actions={actions}
                onClick={handleClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
