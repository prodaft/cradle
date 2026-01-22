import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import useApi from '@/hooks/api/useApi';
import { ArrowClockwiseIcon, HardDrivesIcon } from '@phosphor-icons/react';
import { ManagementActionsCreateActionNameEnum } from '@services/cradle/apis';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

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
            toast.success('Refresh Materialized Graph action triggered!');
        },
        onError: () => {
            toast.error('Failed to refresh materialized graph');
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
            toast.success('Re-calculate Node Positions action triggered!');
        },
        onError: () => {
            toast.error('Failed to re-calculate node positions');
        },
    });

    const handleRefreshMaterializedGraph = () => {
        refreshGraphMutation.mutate();
    };

    const handleRecalculateNodePositions = () => {
        recalculatePositionsMutation.mutate();
    };

    return (
        <div className='w-full h-full'>
            <div className='w-full'>
                {/* Actions Section */}
                <section id='actions'>
                    <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                        Actions
                    </h2>
                    <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                        Maintenance operations for graph visualization
                    </p>

                    <div className='space-y-4'>
                        <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                            <CardContent className='px-4 py-1'>
                                <Field orientation='horizontal' className='py-2'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                            Refresh Materialized Graph
                                        </FieldLabel>
                                        <FieldDescription className='text-sm'>
                                            Rebuild the graph database materialized view
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='self-center'
                                        onClick={handleRefreshMaterializedGraph}
                                    >
                                        <ArrowClockwiseIcon className='w-3.5 h-3.5' weight="bold" />
                                        Refresh
                                    </Button>
                                </Field>

                                <Separator />

                                <Field orientation='horizontal' className='py-2'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                            Recalculate Node Positions
                                        </FieldLabel>
                                        <FieldDescription className='text-sm'>
                                            Recompute all node positions in the graph
                                        </FieldDescription>
                                    </FieldContent>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='self-center'
                                        onClick={handleRecalculateNodePositions}
                                    >
                                        <HardDrivesIcon className='w-3.5 h-3.5' weight="bold" />
                                        Recalculate
                                    </Button>
                                </Field>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </div>
    );
}
