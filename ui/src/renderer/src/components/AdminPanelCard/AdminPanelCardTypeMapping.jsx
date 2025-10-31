import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils.jsx';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Card from '../Card/Card';
import TypeMappingsEditor from '../TypeMappingsEditor/TypeMappingsEditor.jsx';

export default function AdminPanelCardTypeMapping({ name, id, setRightPane }) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

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
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card actions={actions} actionsPosition="bottom-right" className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg">
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleEditClick}>
                        {capitalizeString(name)}
                    </span>
                </h2>
            </Card>
        </>
    );
}
