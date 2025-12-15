import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useState } from 'react';
import { FormAlert, FormAlertState, SettingsButton, SettingsCard, SettingsSeparator } from '../../../forms';
import { Refresh, Server } from 'iconoir-react';

export default function GraphSettingsForm() {
    const { managementApi } = useApi();
    const { execute } = useAPICall();

    const [actionAlert, setActionAlert] = useState<FormAlertState>({
        type: null,
        message: '',
    });

    const handleRefreshMaterializedGraph = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName:
                            ManagementActionsCreateActionNameEnum.RefreshMaterializedGraph,
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Refresh Materialized Graph action triggered!',
            });
        } catch {
            setActionAlert({
                type: 'error',
                message: 'Failed to refresh materialized graph',
            });
        }
    };

    const handleRecalculateNodePositions = async () => {
        try {
            await execute(
                () =>
                    managementApi.managementActionsCreate({
                        actionName: 'recalculateNodePositions' as any,
                    }),
                { suppressNotification: true },
            );
            setActionAlert({
                type: 'success',
                message: 'Re-calculate Node Positions action triggered!',
            });
        } catch {
            setActionAlert({
                type: 'error',
                message: 'Failed to re-calculate node positions',
            });
        }
    };

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        Graph Settings
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
                        Manage graph visualization and computation
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
                            Maintenance operations for graph visualization
                        </p>

                        <div className='space-y-4'>
                            {actionAlert.type && (
                                <FormAlert
                                    alert={actionAlert}
                                    onDismiss={() =>
                                        setActionAlert({ type: null, message: '' })
                                    }
                                />
                            )}
                            <SettingsCard>
                                <SettingsButton
                                    label='Refresh Materialized Graph'
                                    description='Rebuild the graph database materialized view'
                                    buttonText='Refresh'
                                    icon={<Refresh className='w-3.5 h-3.5' />}
                                    onClick={handleRefreshMaterializedGraph}
                                />

                                <SettingsSeparator />

                                <SettingsButton
                                    label='Recalculate Node Positions'
                                    description='Recompute all node positions in the graph'
                                    buttonText='Recalculate'
                                    icon={<Server className='w-3.5 h-3.5' />}
                                    onClick={handleRecalculateNodePositions}
                                />
                            </SettingsCard>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
