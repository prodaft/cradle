import { capitalizeString } from '@/utils/dashboard';
import { EditPencil } from 'iconoir-react/regular';
import { ReactNode } from 'react';
import Card from '../../../base/Card/Card';
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
        setRightPane(<TypeMappingsEditor id={id} onSave={() => {}} />);
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
                title={capitalizeString(name)}
                actions={actions}
                onClick={handleEditClick}
                className='bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg'
            />
        </>
    );
}
