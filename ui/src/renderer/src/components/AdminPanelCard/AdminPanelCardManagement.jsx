import { EditPencil } from 'iconoir-react';
import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Card from '../Card/Card';

export default function AdminPanelCardManagement({
    name,
    SettingComponent,
    setRightPane,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const handleClick = () => {
        setRightPane(<SettingComponent />);
    };

    const actions = [
        {
            icon: <EditPencil />,
            onClick: handleClick,
            tooltip: 'Edit',
            variant: 'ghost',
        },
    ];

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Card actions={actions} actionsPosition="bottom-right" className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg">
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleClick}>
                        {name}
                    </span>
                </h2>
            </Card>
        </>
    );
}
