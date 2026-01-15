import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, InfoCircle, Server, Trash, WarningCircle } from 'iconoir-react';
import { useState } from 'react';
import { SettingsButton, SettingsCard } from '../../../forms';

export default function EntriesManagement() {
    const { managementApi } = useApi();

    const propagateAccessMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: 'propagateAccessVectors',
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            setAlert({
                type: 'success',
                message: 'Propagate Access Vectors action triggered successfully!',
            });
        },
        onError: () => {
            setAlert({
                type: 'error',
                message: 'Error occurred while propagating access vectors.',
            });
        },
    });

    const deleteHangingArtifactsMutation = useMutation({
        mutationFn: async () => {
            const response = await managementApi.managementActionsCreate({
                actionName: 'deleteHangingArtifacts',
            });
            return response;
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: (response) => {
            setAlert({
                type: 'success',
                message: (response as any)?.message || 'Action completed successfully!',
            });
        },
        onError: () => {
            setAlert({
                type: 'error',
                message: 'Error occurred while deleting hanging artifacts.',
            });
        },
    });
    const [alert, setAlert] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({ type: null, message: '' });

    const handlePropagateAccessVectors = () => {
        propagateAccessMutation.mutate();
    };

    const handleDeleteHangingArtifacts = () => {
        deleteHangingArtifactsMutation.mutate();
    };

    return (
        <div className='w-full h-full'>
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
                            <Alert
                                variant={
                                    alert.type === 'error' ? 'destructive' : 'default'
                                }
                            >
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
    );
}
