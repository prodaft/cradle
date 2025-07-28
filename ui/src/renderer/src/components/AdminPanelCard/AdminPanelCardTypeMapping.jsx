import { EditPencil } from 'iconoir-react/regular';
import { useState } from 'react';
import { capitalizeString } from '../../utils/dashboardUtils/dashboardUtils.jsx';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import TypeMappingsEditor from '../TypeMappingsEditor/TypeMappingsEditor.jsx';

export default function AdminPanelCardTypeMapping({ name, id, setRightPane }) {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const handleEditClick = () => {
        setRightPane(<TypeMappingsEditor id={id} onSave={(a) => {}} />);
    };

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-fit w-full bg-cradle3 p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl'>
                <h2 className='card-header w-full mx-2 px-1 break-all'>
                    <span className='cursor-pointer' onClick={handleEditClick}>
                        {capitalizeString(name)}
                    </span>
                </h2>
                <div className='w-full flex flex-row justify-end'>
                    <button
                        className='btn btn-ghost w-fit h-full p-1'
                        onClick={handleEditClick}
                    >
                        <EditPencil />
                    </button>
                </div>
            </div>
        </>
    );
}
