import { useState } from 'react';

import { Tabs, Tab } from '../Tabs/Tabs';
import Notes from './Notes';
import Files from './Files';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function Documents() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    return (
        <div className='w-full h-full '>
            <AlertDismissible alert={alert} setAlert={setAlert} />

            <Tabs
                defaultTab={0}
                queryParam={'tab'}
                tabClasses='tabs-underline w-full mt-2'
                perTabClass='w-[50%] justify-center'
            >
                <Tab title='Notes' classes='px-12 pt-2'>
                    <Notes setAlert={setAlert} />
                </Tab>
                <Tab title='Files' classes='px-12 pt-2'>
                    <Files setAlert={setAlert} />
                </Tab>
            </Tabs>
        </div>
    );
}
