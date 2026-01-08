import { useState } from 'react';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, WarningCircle, InfoCircle, Server, Trash } from 'iconoir-react';
import { Separator } from '@/components/ui/separator';
import {
    SettingsButton,
    SettingsCard,
} from '../../../forms';

export default function EntriesManagement() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });

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
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>Entry Settings</h2>
                    <p className='text-muted-foreground'>Manage entries and artifacts</p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    {/* Actions Section */}
                    <section id='actions' className='pb-8'>
                        <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                            Actions
                        </h2>
                        <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                            Maintenance operations for entries and artifacts
                        </p>

                        <div className='space-y-4'>
                            {alert.type && (
                                <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
                                    {alert.type === 'success' && <CheckCircle />}
                                    {alert.type === 'error' && <WarningCircle />}
                                    {alert.type === 'warning' && <InfoCircle />}
                                    <AlertDescription>{alert.message}</AlertDescription>
                                </Alert>
                            )}
                            <SettingsCard>
                                <SettingsButton
                                    label='Propagate Access Vectors'
                                    description='Update access permissions across all entries'
                                    buttonText='Propagate'
                                    icon={<Server className='w-3.5 h-3.5' />}
                                    onClick={handlePropagateAccessVectors}
                                />

                                <Separator />

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
