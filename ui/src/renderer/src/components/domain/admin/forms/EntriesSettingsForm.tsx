import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { Server, Trash } from 'iconoir-react';
import { useState } from 'react';
import {
    FormAlert,
    FormAlertState,
    SettingsButton,
    SettingsCard,
    SettingsSeparator,
} from '../../../forms';

export default function EntriesManagement() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();
    const [alert, setAlert] = useState<FormAlertState>({ type: null, message: '' });

    const handlePropagateAccessVectors = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'propagateAccessVectors',
                    }),
                { suppressNotification: true },
            );
            setAlert({
                type: 'success',
                message: 'Propagate Access Vectors action triggered successfully!',
            });
        } catch {
            setAlert({
                type: 'error',
                message: 'Error occurred while propagating access vectors.',
            });
        }
    };

    const handleDeleteHangingArtifacts = async () => {
        try {
            const response = await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'deleteHangingArtifacts',
                    }),
                { suppressNotification: true },
            );
            setAlert({
                type: 'success',
                message: (response as any)?.message || 'Action completed successfully!',
            });
        } catch {
            setAlert({
                type: 'error',
                message: 'Error occurred while deleting hanging artifacts.',
            });
        }
    };

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Entry Settings
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Manage entries and artifacts
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {/* Actions Section */}
                    <section id='actions' className='pb-8'>
                        <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                            Actions
                        </h2>
                        <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
                            Maintenance operations for entries and artifacts
                        </p>

                        <div className='space-y-4'>
                            {alert.type && (
                                <FormAlert
                                    alert={alert}
                                    onDismiss={() =>
                                        setAlert({ type: null, message: '' })
                                    }
                                />
                            )}
                            <SettingsCard>
                                <SettingsButton
                                    label='Propagate Access Vectors'
                                    description='Update access permissions across all entries'
                                    buttonText='Propagate'
                                    icon={<Server className='w-3.5 h-3.5' />}
                                    onClick={handlePropagateAccessVectors}
                                />

                                <SettingsSeparator />

                                <SettingsButton
                                    label='Delete Hanging Artifacts'
                                    description='Remove artifacts that are no longer referenced'
                                    buttonText='Delete'
                                    icon={<Trash className='w-3.5 h-3.5' />}
                                    variant='danger'
                                    onClick={handleDeleteHangingArtifacts}
                                />
                            </SettingsCard>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
