import { ReactNode, useState } from 'react';
import AdminPanelSection from '../AdminPanelSection';
import AdminPanelCardManagement from '../cards/AdminPanelCardManagement';
import EntriesSettingsForm from '../forms/EntriesSettingsForm';
import FileSettingsForm from '../forms/FileSettingsForm';
import GraphSettingsForm from '../forms/GraphSettingsForm';
import NoteSettingsForm from '../forms/NoteSettingsForm';
import UserSettingsForm from '../forms/UserSettingsForm';
import AdminPageLayout from '../AdminPageLayout';

export default function ManagementPage() {
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);

    return (
        <AdminPageLayout rightPane={rightPane}>
            <AdminPanelSection
                title='Management'
                addEnabled={false}
                addTooltipText=''
                handleAdd={() => { }}
                isLoading={false}
            >
                {[
                    <AdminPanelCardManagement
                        key='note'
                        setRightPane={setRightPane}
                        name='Note Settings'
                        SettingComponent={NoteSettingsForm}
                    />,
                    <AdminPanelCardManagement
                        key='files'
                        setRightPane={setRightPane}
                        name='File Settings'
                        SettingComponent={FileSettingsForm}
                    />,
                    <AdminPanelCardManagement
                        key='graph'
                        setRightPane={setRightPane}
                        name='Graph Settings'
                        SettingComponent={GraphSettingsForm}
                    />,
                    <AdminPanelCardManagement
                        key='entries'
                        setRightPane={setRightPane}
                        name='Entry Settings'
                        SettingComponent={EntriesSettingsForm}
                    />,
                    <AdminPanelCardManagement
                        key='users'
                        setRightPane={setRightPane}
                        name='New User Settings'
                        SettingComponent={UserSettingsForm}
                    />,
                ]}
            </AdminPanelSection>
        </AdminPageLayout>
    );
}
