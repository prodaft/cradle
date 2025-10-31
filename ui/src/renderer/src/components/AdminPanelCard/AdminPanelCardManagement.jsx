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
            <Card
                title={name}
                actions={actions}
                onClick={handleClick}
                className="bg-cradle3 bg-opacity-20 backdrop-filter backdrop-blur-lg"
            />
        </>
    );
}
