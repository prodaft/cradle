import { useState } from 'react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { Tabs, Tab } from '../Tabs/Tabs';
import ReportList from '../ReportList/ReportList';
import UploadExternal from '../UploadExternal/UploadExternal';

/**
 * AdminPanel component - This component is used to display the AdminPanel.
 * Displays the AdminPanel with tabs for:
 * - Entities
 * - Entry Types
 * - Users (admin only)
 *
 * Each tab contains a list of cards using the adjusted cards which encapsulate
 * the logic for deletion, editing, and activity navigation.
 *
 * @returns {JSX.Element} AdminPanel
 */
export default function Connectivity() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='w-full h-full'>
                <Tabs
                    defaultTab={0}
                    queryParam={'tab'}
                    tabClasses='tabs-underline w-full mt-2'
                    perTabClass='w-[50%] justify-center'
                >
                    <Tab title='Reports' classes='px-12 pt-2'>
                        <ReportList setAlert={setAlert} />
                    </Tab>
                    <Tab title='Digested Data' classes='px-12 pt-2'>
                        <UploadExternal setAlert={setAlert} />
                    </Tab>
                </Tabs>
            </div>
        </>
    );
}
