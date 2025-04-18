import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { EditPencil } from 'iconoir-react';

export default function AdminPanelCardManagement({
    name,
    SettingComponent,
    setRightPane,
}) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const handleClick = () => {
        setRightPane(<SettingComponent />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleClick}>
                        {name}
                    </span>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={handleClick}
                    >
                        <EditPencil />
                    </button>
                </div>
            </div>
        </>
    );
}
