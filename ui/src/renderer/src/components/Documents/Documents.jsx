import { useState } from 'react';

import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Notes from './Notes';

export default function Documents() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    return (
        <div className='w-full h-full '>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <Notes setAlert={setAlert} />
        </div>
    );
}
