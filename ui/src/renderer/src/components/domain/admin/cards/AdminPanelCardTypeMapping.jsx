import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import { capitalizeString } from '@/utils/dashboard';
import Card from '../../../base/Card/Card';
import TypeMappingsEditor from '../TypeMappingsEditor';

export default function AdminPanelCardTypeMapping({ name, id, setRightPane }) {
    const { notify } = useNotif();

    const handleEditClick = () => {
        setRightPane(<TypeMappingsEditor id={id} onSave={(a) => { }} />);
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
                title={capitalizeString(name)}
                actions={actions}
                onClick={handleEditClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
