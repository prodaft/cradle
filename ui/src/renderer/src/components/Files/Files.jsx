import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import FilesContent from '../Documents/Files';

/**
 * Files page component
 * Main page for managing and viewing all files
 * 
 * @function Files
 * @returns {Files}
 * @constructor
 */
export default function Files() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    return (
        <div className='w-full h-full'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <FilesContent setAlert={setAlert} />
        </div>
    );
}

