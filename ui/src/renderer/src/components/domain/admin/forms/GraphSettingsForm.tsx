import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, InfoCircle, Refresh, Server, WarningCircle } from 'iconoir-react';
import { useState } from 'react';
import { SettingsButton, SettingsCard } from '../../../forms';

export default function GraphSettingsForm() {
    const { managementApi } = useApi();

    const refreshGraphMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName:
                    ManagementActionsCreateActionNameEnum.RefreshMaterializedGraph,
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            setActionAlert({
                type: 'success',
                message: 'Refresh Materialized Graph action triggered!',
            });
        },
        onError: () => {
            setActionAlert({
                type: 'error',
                message: 'Failed to refresh materialized graph',
            });
        },
    });

    const recalculatePositionsMutation = useMutation({
        mutationFn: async () => {
            await managementApi.managementActionsCreate({
                actionName: 'recalculateNodePositions' as any,
            });
        },
        meta: {
            suppressNotification: true,
        },
        onSuccess: () => {
            setActionAlert({
                type: 'success',
                message: 'Re-calculate Node Positions action triggered!',
            });
        },
        onError: () => {
            setActionAlert({
                type: 'error',
                message: 'Failed to re-calculate node positions',
            });
        },
    });

    const [actionAlert, setActionAlert] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({
        type: null,
        message: '',
    });

    const handleRefreshMaterializedGraph = () => {
        refreshGraphMutation.mutate();
    };

    const handleRecalculateNodePositions = () => {
        recalculatePositionsMutation.mutate();
    };

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                        Graph Settings
                    </h2>
                    <p className='text-muted-foreground'>
                        Manage graph visualization and computation
                    </p>
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
                            Maintenance operations for graph visualization
                        </p>

                        <div className='space-y-4'>
                            {actionAlert.type && (
                                <Alert
                                    variant={
                                        actionAlert.type === 'error'
                                            ? 'destructive'
                                            : 'default'
                                    }
                                >
                                    {actionAlert.type === 'success' && <CheckCircle />}
                                    {actionAlert.type === 'error' && <WarningCircle />}
                                    {actionAlert.type === 'warning' && <InfoCircle />}
                                    <AlertDescription>
                                        {actionAlert.message}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <SettingsCard>
                                <SettingsButton
                                    label='Refresh Materialized Graph'
                                    description='Rebuild the graph database materialized view'
                                    buttonText='Refresh'
                                    icon={<Refresh className='w-3.5 h-3.5' />}
                                    onClick={handleRefreshMaterializedGraph}
                                />

                                <Separator />

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
